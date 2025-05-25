import PocketBase from 'pocketbase';

interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface McpResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

export class PocketBaseMCP {
  private pb: PocketBase;
  private currentUserId: string | null = null;

  constructor(url: string) {
    this.pb = new PocketBase(url);
  }

  // Helper function to safely stringify data
  private safeStringify(data: unknown): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('JSON stringify error:', error);
      // Fallback to a safe representation
      return JSON.stringify({
        error: 'Failed to serialize data',
        message: error instanceof Error ? error.message : 'Unknown serialization error',
        dataType: typeof data,
      }, null, 2);
    }
  }

  // Set the current authenticated user (for security context)
  setCurrentUser(userId: string, authToken?: string) {
    this.currentUserId = userId;
    if (authToken) {
      this.pb.authStore.save(authToken);
    }
  }

  // Security filter to ensure user can only access their own data
  private addUserFilter(filter?: string): string {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }
    
    const userFilter = `user="${this.currentUserId}"`;
    
    if (filter) {
      return `(${filter}) && ${userFilter}`;
    }
    return userFilter;
  }

  async executeTool(toolCall: McpToolCall): Promise<McpResponse> {
    try {
      switch (toolCall.name) {
        case 'list_user_records':
          return await this.listUserRecords(toolCall.arguments);
        case 'create_user_record':
          return await this.createUserRecord(toolCall.arguments);
        case 'update_user_record':
          return await this.updateUserRecord(toolCall.arguments);
        case 'delete_user_record':
          return await this.deleteUserRecord(toolCall.arguments);
        case 'get_user_analytics':
          return await this.getUserAnalytics();
        case 'calculate_spending_by_category':
          return await this.calculateSpendingByCategory(toolCall.arguments);
        case 'get_monthly_summary':
          return await this.getMonthlySummary(toolCall.arguments);
        case 'find_transactions_by_amount':
          return await this.findTransactionsByAmount(toolCall.arguments);
        case 'get_recent_transactions':
          return await this.getRecentTransactions(toolCall.arguments);
        case 'calculate_average_spending':
          return await this.calculateAverageSpending(toolCall.arguments);
        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    } catch (error: unknown) {
      throw new Error(`PocketBase MCP error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async listUserRecords(args: Record<string, unknown>): Promise<McpResponse> {
    const { collection, filter, sort, page, perPage } = args as {
      collection: string;
      filter?: string;
      sort?: string;
      page?: number;
      perPage?: number;
    };
    const options: Record<string, unknown> = {};
    // Apply user security filter
    options.filter = this.addUserFilter(filter);
    if (sort) options.sort = sort;    const result = await this.pb.collection(collection).getList(
      page || 1,
      perPage || 50,
      options
    );

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(result),
      }],
    };
  }

  private async createUserRecord(args: Record<string, unknown>): Promise<McpResponse> {
    const { collection, data } = args as { collection: string; data: Record<string, unknown> };
    // Ensure the record is associated with the current user
    const recordData = {
      ...data,
      user: this.currentUserId,
    };    const result = await this.pb.collection(collection).create(recordData);
    return {
      content: [{
        type: 'text',
        text: this.safeStringify(result),
      }],
    };
  }

  private async updateUserRecord(args: Record<string, unknown>): Promise<McpResponse> {
    const { collection, id, data } = args as { collection: string; id: string; data: Record<string, unknown> };
    // First verify the record belongs to the current user
    const existingRecord = await this.pb.collection(collection).getOne(id, {
      filter: this.addUserFilter(),
    });
    if (!existingRecord) {
      throw new Error('Record not found or access denied');
    }    const result = await this.pb.collection(collection).update(id, data);
    return {
      content: [{
        type: 'text',
        text: this.safeStringify(result),
      }],
    };
  }

  private async deleteUserRecord(args: Record<string, unknown>): Promise<McpResponse> {
    const { collection, id } = args as { collection: string; id: string };
    // First verify the record belongs to the current user
    const existingRecord = await this.pb.collection(collection).getOne(id, {
      filter: this.addUserFilter(),
    });
    if (!existingRecord) {
      throw new Error('Record not found or access denied');
    }
    await this.pb.collection(collection).delete(id);
    const result = {
      message: `Successfully deleted record ${id} from collection ${collection}`,
    };
    return {
      content: [{
        type: 'text',
        text: this.safeStringify(result),
      }],
    };
  }

  private async getUserAnalytics(): Promise<McpResponse> {
    const filter = this.addUserFilter();
    
    // Get all transactions for the user
    const transactions = await this.pb.collection('transactions').getFullList({
      filter,
      sort: '-created',
    });

    // Calculate analytics
    const totalTransactions = transactions.length;
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const netBalance = totalIncome - totalExpenses;

    // Category breakdown
    const categoryBreakdown = transactions.reduce((acc, t) => {
      const category = t.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + parseFloat(t.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const analytics = {
      totalTransactions,
      totalIncome,
      totalExpenses,
      netBalance,
      categoryBreakdown,
      averageTransactionAmount: totalTransactions > 0 ? (totalIncome + totalExpenses) / totalTransactions : 0,
    };

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(analytics),
      }],
    };
  }

  private async calculateSpendingByCategory(args: Record<string, unknown>): Promise<McpResponse> {
    const { startDate, endDate } = args as { startDate?: string; endDate?: string };
    const filter = this.addUserFilter();
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ` && created >= "${startDate}" && created <= "${endDate}"`;
    }
    const transactions = await this.pb.collection('transactions').getFullList({
      filter: filter + dateFilter,
    });

    const spendingByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + parseFloat(t.amount || 0);
        return acc;
      }, {} as Record<string, number>);

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(spendingByCategory),
      }],
    };
  }

  private async getMonthlySummary(args: Record<string, unknown>): Promise<McpResponse> {
    const { year, month } = args as { year?: number; month?: number };
    const resolvedYear = year || new Date().getFullYear();
    const resolvedMonth = month || new Date().getMonth() + 1;
    const startDate = `${resolvedYear}-${resolvedMonth.toString().padStart(2, '0')}-01`;
    const endDate = `${resolvedYear}-${resolvedMonth.toString().padStart(2, '0')}-31`;
    const filter = this.addUserFilter() + ` && created >= "${startDate}" && created <= "${endDate}"`;

    const transactions = await this.pb.collection('transactions').getFullList({
      filter,
      sort: '-created',
    });

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const summary = {
      year: resolvedYear,
      month: resolvedMonth,
      totalTransactions: transactions.length,
      totalIncome: income,
      totalExpenses: expenses,
      netSavings: income - expenses,
      transactions: transactions.slice(0, 10), // Return latest 10 transactions
    };

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(summary),
      }],
    };
  }

  private async findTransactionsByAmount(args: Record<string, unknown>): Promise<McpResponse> {
    const { minAmount, maxAmount, exactAmount } = args as { minAmount?: number; maxAmount?: number; exactAmount?: number };
    const filter = this.addUserFilter();
    let amountFilter = '';
    if (minAmount !== undefined && maxAmount !== undefined) {
      amountFilter = ` && amount >= ${minAmount} && amount <= ${maxAmount}`;
    } else if (minAmount !== undefined) {
      amountFilter = ` && amount >= ${minAmount}`;
    } else if (maxAmount !== undefined) {
      amountFilter = ` && amount <= ${maxAmount}`;
    } else if (exactAmount !== undefined) {
      amountFilter = ` && amount = ${exactAmount}`;
    }
    const transactions = await this.pb.collection('transactions').getFullList({
      filter: filter + amountFilter,
      sort: '-created',
    });

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(transactions),
      }],
    };
  }

  private async getRecentTransactions(args: Record<string, unknown>): Promise<McpResponse> {
    const { limit } = args as { limit?: number };
    const filter = this.addUserFilter();
    const resolvedLimit = limit || 10;

    const transactions = await this.pb.collection('transactions').getList(1, resolvedLimit, {
      filter,
      sort: '-created',
    });

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(transactions),
      }],
    };
  }

  private async calculateAverageSpending(args: Record<string, unknown>): Promise<McpResponse> {
    const { startDate, endDate } = args as { startDate?: string; endDate?: string };
    const filter = this.addUserFilter();
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ` && created >= "${startDate}" && created <= "${endDate}"`;
    }
    const transactions = await this.pb.collection('transactions').getFullList({
      filter: filter + dateFilter + ' && type = "expense"',
    });

    const totalSpending = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const averageSpending = transactions.length > 0 ? totalSpending / transactions.length : 0;

    const result = {
      totalTransactions: transactions.length,
      totalSpending,
      averageSpending,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'All time',
    };

    return {
      content: [{
        type: 'text',
        text: this.safeStringify(result),
      }],
    };
  }

  // Get available tools for the current user context
  getAvailableTools() {
    return [
      {
        name: 'list_user_records',
        description: 'List records from a collection that belong to the current user',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            filter: { type: 'string', description: 'Additional filter query' },
            sort: { type: 'string', description: 'Sort field and direction' },
            page: { type: 'number', description: 'Page number' },
            perPage: { type: 'number', description: 'Items per page' },
          },
          required: ['collection'],
        },
      },
      {
        name: 'create_user_record',
        description: 'Create a new record associated with the current user',
        inputSchema: {
          type: 'object',
          properties: {
            collection: { type: 'string', description: 'Collection name' },
            data: { type: 'object', description: 'Record data' },
          },
          required: ['collection', 'data'],
        },
      },
      {
        name: 'get_user_analytics',
        description: 'Get comprehensive financial analytics for the current user, including total income, total expenses, net balance (i.e., total balance or overall financial status), and category breakdowns.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'calculate_spending_by_category',
        description: 'Calculate spending breakdown by category for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
      {
        name: 'get_monthly_summary',
        description: 'Get monthly financial summary for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Year (default: current year)' },
            month: { type: 'number', description: 'Month 1-12 (default: current month)' },
          },
        },
      },
      {
        name: 'find_transactions_by_amount',
        description: 'Find transactions by amount range',
        inputSchema: {
          type: 'object',
          properties: {
            minAmount: { type: 'number', description: 'Minimum amount' },
            maxAmount: { type: 'number', description: 'Maximum amount' },
            exactAmount: { type: 'number', description: 'Exact amount' },
          },
        },
      },
      {
        name: 'get_recent_transactions',
        description: 'Get recent transactions for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of transactions to return (default: 10)' },
          },
        },
      },
      {
        name: 'calculate_average_spending',
        description: 'Calculate average spending for the current user',
        inputSchema: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          },
        },
      },
    ];
  }
}

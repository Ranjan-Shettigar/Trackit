'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, AreaChart, Area } from 'recharts';
import Layout from '@/components/layout';
import pb from '@/utils/pocketbase';
import { RecordModel } from 'pocketbase';

interface Transaction extends RecordModel {
  date: string;
  description: string;
  amount: number;
  type: 'Paid' | 'Received';
  mode: 'Cred' | 'GPay' | 'Cash' | 'Loan' | 'Credit card';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function Analytics() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState({
    timeFrame: 'month',
    type: 'all',
    mode: 'all',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const resultList = await pb.collection('transactions').getList<Transaction>(1, 1000, {
        sort: '-date',
      });
      setTransactions(resultList.items);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilter(prevFilter => ({ ...prevFilter, [name]: value }));
  };

  const applyFilters = useCallback(() => {
    let filtered = [...transactions];

    // Apply time frame filter
    const now = new Date();
    if (filter.timeFrame === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(t => new Date(t.date) >= startOfMonth);
    } else if (filter.timeFrame === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(t => new Date(t.date) >= startOfYear);
    }

    // Apply type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(t => t.type === filter.type);
    }

    // Apply mode filter
    if (filter.mode !== 'all') {
      filtered = filtered.filter(t => t.mode === filter.mode);
    }

    // Apply date range filter
    if (filter.startDate) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(filter.startDate));
    }
    if (filter.endDate) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(filter.endDate));
    }

    setFilteredTransactions(filtered);
  }, [transactions, filter]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filter, applyFilters]);

  const getTotalIncomeExpenses = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = monthNames.map(month => ({
      name: month,
      Income: 0,
      Expenses: 0
    }));

    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthIndex = date.getMonth();
      if (transaction.type === 'Received') {
        data[monthIndex].Income += transaction.amount;
      } else {
        data[monthIndex].Expenses += transaction.amount;
      }
    });

    return data;
  };

  const getBalanceOverTime = () => {
    let balance = 0;
    return filteredTransactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(transaction => {
        balance += transaction.type === 'Received' ? transaction.amount : -transaction.amount;
        return { date: transaction.date, balance };
      });
  };

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-6">Financial Analytics</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="timeFrame">Time Frame</Label>
              <Select onValueChange={(value) => handleFilterChange('timeFrame', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time frame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(value) => handleFilterChange('type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="mode">Mode</Label>
              <Select onValueChange={(value) => handleFilterChange('mode', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Cred">Cred</SelectItem>
                  <SelectItem value="GPay">GPay</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Loan">Loan</SelectItem>
                  <SelectItem value="Credit card">Credit card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filter.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filter.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">${filteredTransactions.reduce((sum, t) => t.type === 'Received' ? sum + t.amount : sum, 0).toFixed(2)}</h2>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 className="text-3xl font-bold">${filteredTransactions.reduce((sum, t) => t.type === 'Paid' ? sum + t.amount : sum, 0).toFixed(2)}</h2>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Income vs. Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getTotalIncomeExpenses()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Income" stroke="#82ca9d" />
              <Line type="monotone" dataKey="Expenses" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Balance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getBalanceOverTime()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="balance" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Layout>
  );
}

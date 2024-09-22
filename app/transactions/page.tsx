'use client'

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Layout from '@/components/layout';
import pb from '@/utils/pocketbase';
import { RecordModel } from 'pocketbase';
import * as XLSX from 'xlsx';

interface Transaction extends RecordModel {
  date: string;
  description: string;
  amount: number;
  type: 'Paid' | 'Received';
  mode: 'Cred' | 'GPay' | 'Cash' | 'Loan';
}

interface FilterState {
  type: string;
  mode: string;
  startDate: string;
  endDate: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterState>({ type: '', mode: '', startDate: '', endDate: '' });

  const fetchTransactions = useCallback(async () => {
    try {
      let filterString = '';
      if (filter.type) filterString += `type = "${filter.type}"`;
      if (filter.mode) filterString += (filterString ? ' && ' : '') + `mode = "${filter.mode}"`;
      if (filter.startDate) filterString += (filterString ? ' && ' : '') + `date >= "${filter.startDate}"`;
      if (filter.endDate) filterString += (filterString ? ' && ' : '') + `date <= "${filter.endDate}"`;

      const resultList = await pb.collection('transactions').getList<Transaction>(currentPage, 10, {
        sort: '-date',
        filter: filterString,
      });
      setTransactions(resultList.items);
      setTotalPages(Math.ceil(resultList.totalItems / 10));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await pb.collection('transactions').delete(id);
        fetchTransactions();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const exportToExcel = async () => {
    try {
      let filterString = '';
      if (filter.type) filterString += `type = "${filter.type}"`;
      if (filter.mode) filterString += (filterString ? ' && ' : '') + `mode = "${filter.mode}"`;
      if (filter.startDate) filterString += (filterString ? ' && ' : '') + `date >= "${filter.startDate}"`;
      if (filter.endDate) filterString += (filterString ? ' && ' : '') + `date <= "${filter.endDate}"`;

      const resultList = await pb.collection('transactions').getFullList<Transaction>({
        sort: '-date',
        filter: filterString,
      });

      const worksheet = XLSX.utils.json_to_sheet(resultList.map(item => ({
        Date: new Date(item.date).toLocaleDateString(),
        Description: item.description,
        Amount: item.amount,
        Type: item.type,
        Mode: item.mode
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

      XLSX.writeFile(workbook, "transactions.xlsx");
    } catch (error) {
      console.error('Error exporting transactions:', error);
    }
  };

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-6">Transactions</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                name="type"
                value={filter.type}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
                aria-label="Transaction Type"
              >
                <option value="">All</option>
                <option value="Paid">Paid</option>
                <option value="Received">Received</option>
              </select>
            </div>

            <div>
              <Label htmlFor="mode">Mode</Label>
              <select
                id="mode"
                name="mode"
                value={filter.mode}
                onChange={handleFilterChange}
                className="w-full p-2 border rounded"
                aria-label="Payment Mode"
              >
                <option value="">All</option>
                <option value="Cred">Cred</option>
                <option value="GPay">GPay</option>
                <option value="Cash">Cash</option>
                <option value="Loan">Loan</option>
              </select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={filter.startDate}
                onChange={handleFilterChange}
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={filter.endDate}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={exportToExcel}>Export to Excel</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className={transaction.type === 'Received' ? 'text-green-500' : 'text-red-500'}>
                    {transaction.type === 'Received' ? '+' : '-'}${transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.mode}</TableCell>
                  <TableCell>
                    <Button variant="destructive" onClick={() => handleDelete(transaction.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>Page {currentPage} of {totalPages}</span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
}

'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectValue, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Layout from '@/components/layout';
import pb from '@/utils/pocketbase';
import { RecordModel } from 'pocketbase';

interface Transaction extends RecordModel {
  date: string;
  description: string;
  amount: number;
  type: 'Paid' | 'Received';
  mode: 'Cred' | 'GPay' | 'Cash' | 'Loan' |'Credit card';
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

  const getCategoryData = () => {
    const categoryMap = filteredTransactions.reduce((acc, transaction) => {
      if (transaction.type === 'Paid') {
        acc[transaction.mode] = (acc[transaction.mode] || 0) + transaction.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const getMonthlyData = () => {
    const monthlyMap = filteredTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (transaction.type === 'Paid') {
        acc[monthYear] = (acc[monthYear] || 0) + transaction.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const SpendingTrends = () => {
    const chartData = filteredTransactions.slice(0, 7).map(t => ({
      date: new Date(t.date).toLocaleDateString(),
      amount: t.type === 'Received' ? t.amount : -t.amount
    })).reverse();

    return (
      <Card className="mb-6 mt-6">  
        <CardHeader>
          <CardTitle>Spending Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="amount" stroke="#0070F3" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getCategoryData()}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {getCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <SpendingTrends />
    </Layout>
  );
}

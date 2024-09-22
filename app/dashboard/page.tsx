'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Layout from '@/components/layout'
import pb from '@/utils/pocketbase'
import { RecordModel } from 'pocketbase'

interface Transaction extends RecordModel {
  date: string;
  description: string;
  amount: number;
  type: string;
  mode: string;
}

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [monthlySpending, setMonthlySpending] = useState(0)
  const [newTransaction, setNewTransaction] = useState({
    date: '',
    description: '',
    amount: '',
    mode: '',
    type: ''
  })

  // Predefined mode and type options
  const modeOptions = ['Cred', 'GPay', 'Cash', 'Loan']
  const typeOptions = ['Received', 'Paid']

  // Memoized fetchTransactions function using useCallback
  const fetchTransactions = useCallback(async () => {
    try {
      console.log('Fetching transactions...')
      const resultList = await pb.collection('transactions').getList<Transaction>(1, 50, {
        sort: '-date',
        expand: 'user'
      })
      console.log('Fetched transactions:', resultList.items)
      setTransactions(resultList.items)
      calculateTotals(resultList.items)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const calculateTotals = (transactions: Transaction[]) => {
    const total = transactions.reduce((acc, transaction) => {
      return transaction.type === 'Received' 
        ? acc + transaction.amount 
        : acc - transaction.amount
    }, 0)
    setTotalBalance(total)

    const currentMonth = new Date().getMonth()
    const monthlyTransactions = transactions.filter(t => new Date(t.date).getMonth() === currentMonth)
    const monthlyTotal = monthlyTransactions.reduce((acc, transaction) => {
      return transaction.type === 'Paid' ? acc + transaction.amount : acc
    }, 0)
    setMonthlySpending(monthlyTotal)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewTransaction(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewTransaction(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('Submitting new transaction:', newTransaction)
      await pb.collection('transactions').create({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        user: pb.authStore.model?.id
      })
      setNewTransaction({
        date: '',
        description: '',
        amount: '',
        mode: '',
        type: ''
      })
      fetchTransactions()
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-6">Financial Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-500">${totalBalance.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-400">${monthlySpending.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-500">{transactions.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={newTransaction.date}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={newTransaction.description}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                value={newTransaction.amount}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="mode">Mode</Label>
              <Select 
                name="mode" 
                value={newTransaction.mode} 
                onValueChange={(value) => handleSelectChange('mode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select 
                name="type" 
                value={newTransaction.type} 
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit">Add Transaction</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {transactions.slice(0, 5).map((transaction) => (
              <li key={transaction.id} className="flex justify-between items-center">
                <span>{transaction.description}</span>
                <span className={transaction.type === 'Received' ? 'text-green-500' : 'text-red-500'}>
                  {transaction.type === 'Received' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Layout>
  )
}

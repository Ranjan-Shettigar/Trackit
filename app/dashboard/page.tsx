'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Mic, MicOff, AlertCircle, CheckCircle } from 'lucide-react'
import { Textarea } from "@/components/ui/textarea"
import Layout from '@/components/layout'
import pb from '@/utils/pocketbase'
import { RecordModel } from 'pocketbase'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ArrowUp, ArrowDown } from 'lucide-react';

// Add these type definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: () => void;
  onend: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface Transaction extends RecordModel {
  date: string;
  time: string;
  description: string;
  amount: number;
  type: string;
  mode: string;
}

const useSpeechRecognition = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          setError('Speech recognition is not supported in this browser. Please use Chrome.');
          return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };
        recognition.onend = () => {
          setIsListening(false);
        };
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const current = event.resultIndex;
          const transcriptResult = event.results[current][0].transcript;
          setTranscript(transcriptResult);
        };
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          switch (event.error) {
            case 'not-allowed':
              setError('Microphone access denied. Please enable microphone access in your browser settings.');
              break;
            case 'no-speech':
              setError('No speech detected. Please try again.');
              break;
            case 'audio-capture':
              setError('No microphone found. Please connect a microphone and try again.');
              break;
            default:
              setError(`Error: ${event.error}`);
          }
          setIsListening(false);
        };
        setRecognition(recognition);
      } catch (err) {
        setError('Failed to initialize speech recognition. Please try reloading the page.');
        console.error('Speech Recognition Init Error:', err);
      }
    }
  }, []);

  const startListening = async () => {
    if (!recognition) {
      setError('Speech recognition not initialized. Please reload the page.');
      return;
    }
    try {
      setError(null);
      setTranscript('');
      await recognition.start();
    } catch (err) {
      setError('Error starting recognition. Please try again.');
      console.error('Start Recognition Error:', err);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const resetTranscript = () => {
    setTranscript('');
    setError(null);
  };

  return { transcript, isListening, error, startListening, stopListening, resetTranscript };
};

export default function Dashboard() {
  const getCurrentDate = () => {
    return new Date().toISOString().split('T')[0];
  }

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [monthlySpending, setMonthlySpending] = useState(0)
  const [newTransaction, setNewTransaction] = useState({
    date: getCurrentDate(),
    description: '',
    amount: '',
    mode: 'GPay',
    type: 'Paid'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { transcript, isListening, error: speechError, startListening, stopListening } = useSpeechRecognition();
  const [recognizedText, setRecognizedText] = useState('')
  const [isProcessed, setIsProcessed] = useState(false);

  const modeOptions = ['Cred', 'GPay', 'Cash', 'Loan', 'Credit card']    
  const typeOptions = ['Received', 'Paid']

  const fetchTransactions = useCallback(async () => {
    try {
      const resultList = await pb.collection('transactions').getList<Transaction>(1, 50, {
        sort: '-created',
        expand: 'user'
      })
      setTransactions(resultList.items)
      calculateTotals(resultList.items)
    } catch (error) {
      console.error('Error fetching transactions:', error)
      setError('Failed to fetch transactions. Please try again.')
    }
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    if (transcript) {
      setRecognizedText(transcript)
    }
  }, [transcript])

  const calculateTotals = (transactions: Transaction[]) => {
    const total = transactions.reduce((acc, transaction) => 
      transaction.type === 'Received' ? acc + transaction.amount : acc - transaction.amount, 0)
    setTotalBalance(total)

    const currentMonth = new Date().getMonth()
    const monthlyTotal = transactions
      .filter(t => new Date(t.date).getMonth() === currentMonth && t.type === 'Paid')
      .reduce((acc, transaction) => acc + transaction.amount, 0)
    setMonthlySpending(monthlyTotal)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewTransaction(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewTransaction(prev => ({ ...prev, [name]: value }))
  }

  const handleRecognizedTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecognizedText(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const transactionToSubmit = {
        ...newTransaction,
        amount: parseFloat(newTransaction.amount),
        user: pb.authStore.model?.id
      }
      await pb.collection('transactions').create(transactionToSubmit)
      alert("Transaction added successfully!");
      setNewTransaction({
        date: getCurrentDate(),
        description: '',
        amount: '',
        mode: 'GPay',
        type: 'Paid'
      })
      fetchTransactions()
    } catch (error) {
      console.error('Error creating transaction:', error)
      setError('Failed to add transaction. Please try again.')
    } finally {
      setIsSubmitting(false);
    }
  }

  const processTranscript = async (text: string) => {
    console.log('Recognized text:', text);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

      const prompt = `Extract the following information from this text and format it as JSON:
      1. date (in YYYY-MM-DD format, use today's date "${getCurrentDate()}" if not specified in the text)
      2. description (a brief 10 words description of the transaction)
      3. amount (as a number)
      4. mode (one of: Cred, GPay, Cash, Loan, Credit card)
      5. type (either Paid or Received)

      If certain information is unclear or missing:
      - Use "${getCurrentDate()}" for missing date
      - Use 'GPay' for missing mode
      - Use 'Paid' for missing type
      - Extract numbers following currency symbols or words like 'paid', 'received', 'spent' for amount
      - Use the full text as description if no clear description is found

      Text: "${text}"

      Respond ONLY with the JSON object, no other text.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in the response");
      }

      const jsonString = jsonMatch[0];
      const jsonResult = JSON.parse(jsonString);
      console.log('Gemini API output:', jsonResult);

      // Validate the parsed JSON
      const requiredFields = ['date', 'description', 'amount', 'mode', 'type'];
      for (const field of requiredFields) {
        if (!(field in jsonResult)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }

      // Convert amount to a number if it's a string
      if (typeof jsonResult.amount === 'string') {
        jsonResult.amount = parseFloat(jsonResult.amount);
      }

      // Validate mode and type
      const validModes = ['Cred', 'GPay', 'Cash', 'Loan', 'Credit card'];
      const validTypes = ['Paid', 'Received'];
      if (!validModes.includes(jsonResult.mode)) {
        jsonResult.mode = 'GPay';
      }
      if (!validTypes.includes(jsonResult.type)) {
        jsonResult.type = 'Paid';
      }

      setNewTransaction(prevState => ({
        ...prevState,
        ...jsonResult
      }));
    } catch (error) {
      console.error('Error processing transcript:', error);
      setError(`Error processing voice input. Please try again or enter the information manually.`);
    }
  };

  const handleProcessRecognizedText = () => {
    setError(null);
    setIsProcessed(false);
    processTranscript(recognizedText).then(() => {
      setIsProcessed(true);
    });
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
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
            <p className="text-3xl font-bold text-primary">₹{totalBalance.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">₹{monthlySpending.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{transactions.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <Button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={isListening ? "bg-destructive hover:bg-destructive/90" : ""}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                {isListening ? "Stop Listening" : "Start Listening"}
              </Button>
            </div>
            {(error || speechError) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error || speechError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="recognizedText">Recognized Text</Label>
              <Textarea
                id="recognizedText"
                value={recognizedText}
                onChange={handleRecognizedTextChange}
                placeholder="Recognized text will appear here. You can edit it if needed."
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <Button type="button" onClick={handleProcessRecognizedText}>
                  Process Text
                </Button>
                {isProcessed && (
                  <span className="text-green-500 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" /> Processed
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={newTransaction.description}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <Select 
                name="mode" 
                value={newTransaction.mode} 
                onValueChange={(value) => handleSelectChange('mode', value)}
              >
                <SelectTrigger id="mode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select 
                name="type" 
                value={newTransaction.type}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isSubmitting}>Add Transaction</Button>
          </form>
        </CardContent>
      </Card>

      

      <Card>
  <CardHeader>
    <CardTitle>Recent Transactions</CardTitle>
  </CardHeader>
  <CardContent>
    <ul className="recent-transactions">
      {transactions.slice(0, 5).map((transaction) => (
        <li key={transaction.id}>
          <div className="transaction-details">
            <span className="description">{transaction.description}</span>
            <span className="type">
              {transaction.type === 'Received' ? 'Received Money' : 'Send Money'}
            </span>
          </div>
          <div className="transaction-amount">
            <span className={`amount ${transaction.type === 'Received' ? 'text-hsl-221-83-53' : 'text-hsl-0-84-60'}`}>
              {transaction.type === 'Received' ? <ArrowUp className="inline-block mr-1" /> : <ArrowDown className="inline-block mr-1" />}
              ₹{transaction.amount.toFixed(2)}
            </span>
            <span className="time">
              {formatDate(transaction.date)} {formatTime(transaction.created)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  </CardContent>
</Card>
    </Layout>
  )
}
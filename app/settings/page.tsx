'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Layout from '@/components/layout'
import pb from '@/utils/pocketbase'

interface User {
  id: string;
  username: string;
  email: string;
  emailNotifications: boolean;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailNotifications, setEmailNotifications] = useState(false)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const userId = pb.authStore.model?.id
      if (userId) {
        const userData = await pb.collection('users').getOne<User>(userId)
        setUser(userData)
        setEmailNotifications(userData.emailNotifications || false)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const handleUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (user) {
        await pb.collection('users').update(user.id, {
          username: newUsername,
        })
        alert('Username updated successfully')
        setNewUsername('')
        fetchUserData() // Refresh user data
      }
    } catch (error) {
      console.error('Error updating username:', error)
      alert('Failed to update username. Please try again.')
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match')
      return
    }
    try {
      if (user) {
        await pb.collection('users').update(user.id, {
          password: newPassword,
          passwordConfirm: confirmPassword,
        })
        alert('Password updated successfully')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (error) {
      console.error('Error updating password:', error)
      alert('Failed to update password. Please try again.')
    }
  }

  const handleEmailNotificationsChange = async () => {
    try {
      if (user) {
        const updatedUser = await pb.collection('users').update<User>(user.id, {
          emailNotifications: !emailNotifications,
        })
        setEmailNotifications(updatedUser.emailNotifications)
      }
    } catch (error) {
      console.error('Error updating email notifications setting:', error)
    }
  }

  if (!user) {
    return <Layout>Loading...</Layout>
  }

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-6">Settings</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change Username</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUsernameChange} className="space-y-4">
            <div>
              <Label htmlFor="newUsername">New Username</Label>
              <Input
                id="newUsername"
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Update Username</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit">Update Password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="emailNotifications"
              checked={emailNotifications}
              onCheckedChange={handleEmailNotificationsChange}
            />
            <Label htmlFor="emailNotifications">Receive email notifications</Label>
          </div>
        </CardContent>
      </Card>
    </Layout>
  )
}
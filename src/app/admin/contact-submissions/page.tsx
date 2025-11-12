// src/app/admin/contact-submissions/page.tsx - Admin View Contact Submissions
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface ContactSubmission {
  id: string
  name: string
  email: string
  subject: string
  message: string
  center_name: string | null
  status: 'new' | 'in_progress' | 'resolved'
  created_at: string
}

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSubmissions(data || [])
    } catch (err) {
      console.error('Error fetching submissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('contact_submissions')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setSubmissions(submissions.map(sub => 
        sub.id === id ? { ...sub, status: newStatus } : sub
      ))

      if (selectedSubmission?.id === id) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus })
      }
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    }
  }

  const filteredSubmissions = filter === 'all' 
    ? submissions 
    : submissions.filter(sub => sub.status === filter)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return '🆕'
      case 'in_progress':
        return '⏳'
      case 'resolved':
        return '✅'
      default:
        return '📝'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading submissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contact Submissions</h1>
              <p className="text-gray-600 mt-1">Manage and respond to user inquiries</p>
            </div>
            <Link
              href="/admin"
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-gray-900">{submissions.length}</div>
            <div className="text-sm text-gray-600">Total Submissions</div>
          </div>
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">
              {submissions.filter(s => s.status === 'new').length}
            </div>
            <div className="text-sm text-blue-800">New</div>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600">
              {submissions.filter(s => s.status === 'in_progress').length}
            </div>
            <div className="text-sm text-yellow-800">In Progress</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-600">
              {submissions.filter(s => s.status === 'resolved').length}
            </div>
            <div className="text-sm text-green-800">Resolved</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'new'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New ({submissions.filter(s => s.status === 'new').length})
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'in_progress'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Progress ({submissions.filter(s => s.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resolved ({submissions.filter(s => s.status === 'resolved').length})
            </button>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📭</div>
              <p className="text-gray-600">No submissions found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {submission.name}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full border font-medium ${getStatusColor(submission.status)}`}>
                          {getStatusIcon(submission.status)} {submission.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-600">
                          <span className="font-medium">Email:</span> {submission.email}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-medium">Subject:</span> {submission.subject}
                        </p>
                        {submission.center_name && (
                          <p className="text-gray-600">
                            <span className="font-medium">Center:</span> {submission.center_name}
                          </p>
                        )}
                        <p className="text-gray-500 text-xs">
                          {formatDate(submission.created_at)}
                        </p>
                      </div>
                      <p className="mt-2 text-gray-700 line-clamp-2">
                        {submission.message}
                      </p>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSubmission(submission)
                      }}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedSubmission.email}</p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="flex gap-2">
                  {(['new', 'in_progress', 'resolved'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => updateStatus(selectedSubmission.id, status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedSubmission.status === status
                          ? getStatusColor(status)
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {getStatusIcon(status)} {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <p className="text-gray-900">{selectedSubmission.subject}</p>
              </div>

              {/* Center Name */}
              {selectedSubmission.center_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related Center</label>
                  <p className="text-gray-900">{selectedSubmission.center_name}</p>
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedSubmission.message}</p>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Submitted</label>
                <p className="text-gray-600">{formatDate(selectedSubmission.created_at)}</p>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Actions</label>
                <div className="flex gap-2">
                  <a
                    href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject}`}
                    className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-center font-medium"
                  >
                    📧 Reply via Email
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSubmission.email)
                      alert('Email copied to clipboard!')
                    }}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    📋 Copy Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
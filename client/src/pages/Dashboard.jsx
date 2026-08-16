import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api/axios'
import socket from '../api/socket'
import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const [servers, setServers] = useState([])
  const [selectedServerId, setSelectedServerId] = useState(null)
  const [selectedServerDetails, setSelectedServerDetails] = useState(null)
  const [selectedChannelId, setSelectedChannelId] = useState(null)

  // Navigation Tab State: 'chat' | 'library' | 'doubts' | 'leaderboard'
  const [activeTab, setActiveTab] = useState('chat')

  // Chat State
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const messagesEndRef = useRef(null)

  // Library / Resource State
  const [resources, setResources] = useState([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  // Doubts State
  const [doubts, setDoubts] = useState([])
  const [loadingDoubts, setLoadingDoubts] = useState(false)
  const [doubtFilter, setDoubtFilter] = useState('all') // 'all' | 'open' | 'solved'
  const [isAskDoubtModalOpen, setIsAskDoubtModalOpen] = useState(false)
  const [doubtTitleInput, setDoubtTitleInput] = useState('')
  const [selectedDoubtChannelId, setSelectedDoubtChannelId] = useState('')
  const [askDoubtLoading, setAskDoubtLoading] = useState(false)
  const [askDoubtError, setAskDoubtError] = useState('')

  // Thread Detail Modal State
  const [selectedThread, setSelectedThread] = useState(null)
  const [replyContentInput, setReplyContentInput] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)
  const [replyError, setReplyError] = useState('')

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false)

  // Create Channel Modal State (Admin Only)
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false)
  const [channelNameInput, setChannelNameInput] = useState('')
  const [createChannelLoading, setCreateChannelLoading] = useState(false)
  const [createChannelError, setCreateChannelError] = useState('')

  const [loadingServers, setLoadingServers] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Server Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState('create') // 'create' | 'join'
  const [serverNameInput, setServerNameInput] = useState('')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [modalError, setModalError] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  // Admin Check for current server
  const isAdmin = selectedServerDetails?.members?.some(
    (m) => m.userId === user?.id && m.role === 'ADMIN'
  )

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom()
    }
  }, [messages, activeTab])

  // Fetch all joined servers
  const fetchServers = async () => {
    try {
      setLoadingServers(true)
      const res = await API.get('/servers')
      const fetchedServers = res.data.servers || []
      setServers(fetchedServers)

      if (fetchedServers.length > 0 && !selectedServerId) {
        setSelectedServerId(fetchedServers[0].id)
      }
    } catch (err) {
      console.error('Error fetching servers:', err)
    } finally {
      setLoadingServers(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  // Fetch details of selected server
  const fetchServerDetails = async () => {
    if (!selectedServerId) {
      setSelectedServerDetails(null)
      return
    }

    try {
      setLoadingDetails(true)
      const res = await API.get(`/servers/${selectedServerId}`)
      const serverData = res.data.server
      setSelectedServerDetails(serverData)

      if (serverData?.channels && serverData.channels.length > 0) {
        if (!selectedChannelId || !serverData.channels.some(c => c.id === selectedChannelId)) {
          setSelectedChannelId(serverData.channels[0].id)
        }
        setSelectedDoubtChannelId(serverData.channels[0].id)
      } else {
        setSelectedChannelId(null)
        setMessages([])
      }
    } catch (err) {
      console.error('Error fetching server details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    fetchServerDetails()
  }, [selectedServerId])

  // Channel Selection & Socket Join + Historical Messages
  useEffect(() => {
    if (!selectedChannelId || activeTab !== 'chat') {
      return
    }

    socket.emit('join_channel', selectedChannelId)

    const fetchChannelMessages = async () => {
      try {
        setLoadingMessages(true)
        const res = await API.get(`/channels/${selectedChannelId}/messages`)
        setMessages(res.data.messages || [])
      } catch (err) {
        console.error('Error fetching channel messages:', err)
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchChannelMessages()
  }, [selectedChannelId, activeTab])

  // Real-time socket message listener
  useEffect(() => {
    const handleReceiveMessage = (newMessage) => {
      if (newMessage.channelId === selectedChannelId) {
        setMessages((prevMessages) => {
          if (prevMessages.some((m) => m.id === newMessage.id)) {
            return prevMessages
          }
          return [...prevMessages, newMessage]
        })
      }
    }

    socket.on('receive_message', handleReceiveMessage)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
    }
  }, [selectedChannelId])

  // Fetch Resources for Library tab
  const fetchResources = async (query = searchQuery) => {
    if (!selectedServerId) return
    try {
      setLoadingResources(true)
      const url = query.trim()
        ? `/resources/server/${selectedServerId}?search=${encodeURIComponent(query.trim())}`
        : `/resources/server/${selectedServerId}`
      const res = await API.get(url)
      setResources(res.data.resources || [])
    } catch (err) {
      console.error('Error fetching resources:', err)
    } finally {
      setLoadingResources(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'library' && selectedServerId) {
      fetchResources()
    }
  }, [activeTab, selectedServerId])

  // Fetch Doubts for Doubts tab
  const fetchDoubts = async (filter = doubtFilter) => {
    if (!selectedServerId) return
    try {
      setLoadingDoubts(true)
      const statusParam = filter === 'all' ? '' : `?status=${filter}`
      const res = await API.get(`/doubts/server/${selectedServerId}${statusParam}`)
      const fetchedThreads = res.data.threads || []
      setDoubts(fetchedThreads)

      if (selectedThread) {
        const updated = fetchedThreads.find((t) => t.id === selectedThread.id)
        if (updated) setSelectedThread(updated)
      }
    } catch (err) {
      console.error('Error fetching doubts:', err)
    } finally {
      setLoadingDoubts(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'doubts' && selectedServerId) {
      fetchDoubts(doubtFilter)
    }
  }, [activeTab, selectedServerId, doubtFilter])

  // Fetch Leaderboard for Leaderboard tab
  const fetchLeaderboard = async () => {
    if (!selectedServerId) return
    try {
      setLoadingLeaderboard(true)
      const res = await API.get(`/servers/${selectedServerId}/leaderboard`)
      setLeaderboard(res.data.leaderboard || [])
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'leaderboard' && selectedServerId) {
      fetchLeaderboard()
    }
  }, [activeTab, selectedServerId])

  // Handle Search Input Change
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    fetchResources(value)
  }

  // Handle Create Channel Submit (Admin Only)
  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault()
    if (!channelNameInput.trim() || !selectedServerId) return
    setCreateChannelError('')
    setCreateChannelLoading(true)

    try {
      const res = await API.post(`/servers/${selectedServerId}/channels`, {
        name: channelNameInput.trim(),
        type: 'TEXT',
      })

      const newChannel = res.data.channel
      setChannelNameInput('')
      setIsCreateChannelModalOpen(false)
      await fetchServerDetails()
      if (newChannel?.id) {
        setSelectedChannelId(newChannel.id)
      }
    } catch (err) {
      setCreateChannelError(err.response?.data?.error || 'Failed to create channel')
    } finally {
      setCreateChannelLoading(false)
    }
  }

  // Handle Resource Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!uploadTitle.trim() || !uploadFile || !selectedServerId) return
    setUploadError('')
    setUploadLoading(true)

    try {
      const formData = new FormData()
      formData.append('serverId', selectedServerId)
      formData.append('title', uploadTitle.trim())
      if (uploadTags.trim()) {
        formData.append('tags', uploadTags.trim())
      }
      formData.append('file', uploadFile)

      await API.post('/resources/upload', formData)

      setUploadTitle('')
      setUploadTags('')
      setUploadFile(null)
      setIsUploadModalOpen(false)
      fetchResources()
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Failed to upload resource')
    } finally {
      setUploadLoading(false)
    }
  }

  // Handle Resource Upvote
  const handleUpvote = async (resourceId) => {
    try {
      await API.post(`/resources/${resourceId}/upvote`)
      fetchResources()
    } catch (err) {
      console.error('Error upvoting resource:', err)
    }
  }

  // Handle Resource Download
  const handleDownload = async (resourceId) => {
    try {
      const res = await API.post(`/resources/${resourceId}/download`)
      if (res.data?.fileUrl) {
        window.open(res.data.fileUrl, '_blank')
      }
      fetchResources()
    } catch (err) {
      console.error('Error downloading resource:', err)
    }
  }

  // Handle Ask Doubt Submit
  const handleAskDoubtSubmit = async (e) => {
    e.preventDefault()
    if (!doubtTitleInput.trim() || !selectedDoubtChannelId || !selectedServerId) return
    setAskDoubtError('')
    setAskDoubtLoading(true)

    try {
      await API.post('/doubts', {
        serverId: selectedServerId,
        channelId: selectedDoubtChannelId,
        title: doubtTitleInput.trim(),
      })

      setDoubtTitleInput('')
      setIsAskDoubtModalOpen(false)
      fetchDoubts(doubtFilter)
    } catch (err) {
      setAskDoubtError(err.response?.data?.error || 'Failed to post doubt')
    } finally {
      setAskDoubtLoading(false)
    }
  }

  // Handle Reply Submit for Doubt Thread
  const handleReplySubmit = async (e) => {
    e.preventDefault()
    if (!replyContentInput.trim() || !selectedThread?.id) return
    setReplyError('')
    setReplyLoading(true)

    try {
      await API.post(`/doubts/${selectedThread.id}/reply`, {
        content: replyContentInput.trim(),
      })

      setReplyContentInput('')
      fetchDoubts(doubtFilter)
    } catch (err) {
      setReplyError(err.response?.data?.error || 'Failed to post reply')
    } finally {
      setReplyLoading(false)
    }
  }

  // Handle Accept Reply as Answer
  const handleAcceptAnswer = async (replyId) => {
    if (!selectedThread?.id) return
    try {
      await API.post(`/doubts/${selectedThread.id}/accept/${replyId}`)
      fetchDoubts(doubtFilter)
    } catch (err) {
      console.error('Error accepting answer:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Helper function to map badge string to emoji + styling
  const getBadgeInfo = (badgeName) => {
    switch (badgeName) {
      case 'Grandmaster':
        return { emoji: '👑', label: 'Grandmaster', bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' }
      case 'Master':
        return { emoji: '💎', label: 'Master', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30' }
      case 'Gold':
        return { emoji: '🥇', label: 'Gold', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
      case 'Silver':
        return { emoji: '🥈', label: 'Silver', bg: 'bg-slate-400/10 text-slate-300 border-slate-400/30' }
      case 'Bronze':
      default:
        return { emoji: '🥉', label: 'Bronze', bg: 'bg-amber-700/10 text-amber-500 border-amber-700/30' }
    }
  }

  // Send Message Action
  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedChannelId || !user?.id) return

    socket.emit('send_message', {
      channelId: selectedChannelId,
      senderId: user.id,
      content: messageInput.trim(),
    })

    setMessageInput('')
  }

  // Create Server Action
  const handleCreateServer = async (e) => {
    e.preventDefault()
    if (!serverNameInput.trim()) return
    setModalError('')
    setModalLoading(true)

    try {
      const res = await API.post('/servers', { name: serverNameInput.trim() })
      const newServer = res.data.server
      await fetchServers()
      setSelectedServerId(newServer.id)
      setServerNameInput('')
      setIsModalOpen(false)
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to create server')
    } finally {
      setModalLoading(false)
    }
  }

  // Join Server Action
  const handleJoinServer = async (e) => {
    e.preventDefault()
    if (!inviteCodeInput.trim()) return
    setModalError('')
    setModalLoading(true)

    try {
      const res = await API.post(`/servers/join/${inviteCodeInput.trim()}`)
      const joinedServer = res.data.server
      await fetchServers()
      setSelectedServerId(joinedServer.id)
      setInviteCodeInput('')
      setIsModalOpen(false)
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to join server')
    } finally {
      setModalLoading(false)
    }
  }

  const activeChannel = selectedServerDetails?.channels?.find(
    (c) => c.id === selectedChannelId
  )

  return (
    <div className="h-screen w-full max-w-full flex bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* COLUMN 1: Narrow Left Sidebar - Server Icons */}
      <aside className="w-20 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 shrink-0 z-10">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-600/30 mb-2 cursor-pointer hover:rounded-xl transition-all duration-200">
          P
        </div>

        <div className="w-8 h-0.5 bg-slate-800 rounded mb-3" />

        {/* Server List */}
        <div className="flex-1 w-full overflow-y-auto flex flex-col items-center gap-3 px-2">
          {loadingServers ? (
            <div className="flex flex-col gap-3 items-center py-2">
              <div className="w-12 h-12 rounded-full bg-slate-800 animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-slate-800 animate-pulse" />
            </div>
          ) : (
            servers.map((server) => {
              const isSelected = server.id === selectedServerId
              const firstLetter = server.name ? server.name.charAt(0).toUpperCase() : 'S'

              return (
                <div key={server.id} className="relative group flex items-center justify-center w-full">
                  {isSelected && (
                    <div className="absolute left-0 w-1.5 h-10 bg-white rounded-r-full" />
                  )}

                  <button
                    onClick={() => setSelectedServerId(server.id)}
                    title={server.name}
                    className={`w-12 h-12 rounded-3xl transition-all duration-200 flex items-center justify-center font-bold text-lg cursor-pointer ${
                      isSelected
                        ? 'rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-slate-800 text-slate-300 hover:rounded-xl hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    {firstLetter}
                  </button>
                </div>
              )
            })
          )}

          <button
            onClick={() => {
              setIsModalOpen(true)
              setModalError('')
            }}
            title="Create or Join a Server"
            className="w-12 h-12 rounded-3xl hover:rounded-xl bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all duration-200 flex items-center justify-center text-2xl font-bold cursor-pointer mt-1"
          >
            +
          </button>
        </div>

        {/* User Profile / Logout */}
        <div className="mt-auto pt-3 border-t border-slate-800 w-full flex flex-col items-center gap-2">
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-red-600/80 text-slate-400 hover:text-white transition duration-200 flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
      </aside>

      {/* RIGHT WORKSPACE AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP NAVIGATION HEADER: Server Name & Tab Switcher */}
        <header className="h-14 w-full border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 bg-slate-900 shrink-0 min-w-0">
          <div className="min-w-0 flex items-center gap-2 sm:gap-3 shrink overflow-hidden">
            <span className="font-bold text-sm sm:text-base text-white truncate max-w-[140px] sm:max-w-[220px]">
              {selectedServerDetails ? selectedServerDetails.name : 'Select a Server'}
            </span>
            {selectedServerDetails?.inviteCode && (
              <span className="shrink-0 text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md text-slate-400 font-mono hidden xl:inline-block" title={`Invite Code: ${selectedServerDetails.inviteCode}`}>
                Code: {selectedServerDetails.inviteCode}
              </span>
            )}
            {isAdmin && (
              <span className="shrink-0 text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded-full">
                ADMIN
              </span>
            )}
          </div>

          {/* TAB NAVIGATION */}
          <div className="shrink-0 flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'library'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📚 Library
            </button>
            <button
              onClick={() => setActiveTab('doubts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'doubts'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ❓ Doubts
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'leaderboard'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏆 Leaderboard
            </button>
          </div>
        </header>

        {/* VIEW 1: CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden">
            <section className="w-60 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0">
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {loadingDetails ? (
                  <div className="space-y-2 py-2">
                    <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4" />
                    <div className="h-8 bg-slate-800 rounded animate-pulse" />
                    <div className="h-8 bg-slate-800 rounded animate-pulse" />
                  </div>
                ) : selectedServerDetails ? (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Text Channels
                      </div>
                      {/* ADMIN ONLY: Create Channel Button */}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setIsCreateChannelModalOpen(true)
                            setCreateChannelError('')
                          }}
                          title="Create Channel (Admin Only)"
                          className="w-5 h-5 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer transition"
                        >
                          +
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {selectedServerDetails.channels && selectedServerDetails.channels.length > 0 ? (
                        selectedServerDetails.channels.map((channel) => {
                          const isChannelActive = channel.id === selectedChannelId
                          return (
                            <button
                              key={channel.id}
                              onClick={() => setSelectedChannelId(channel.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition duration-150 cursor-pointer ${
                                isChannelActive
                                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                              }`}
                            >
                              <span className="text-slate-500 font-bold">#</span>
                              <span className="truncate">{channel.name}</span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="text-slate-500 text-sm px-2 italic py-2">No channels yet</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm text-center mt-10">No server selected</div>
                )}
              </div>

              <div className="h-14 bg-slate-950/80 border-t border-slate-800 px-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
                  {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-semibold text-white truncate">{user?.username || 'User'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email || ''}</div>
                </div>
              </div>
            </section>

            <main className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              <div className="h-12 border-b border-slate-800 px-6 flex items-center gap-2 font-semibold text-white shrink-0">
                {activeChannel ? (
                  <>
                    <span className="text-slate-500 text-xl font-bold">#</span>
                    <span className="text-base font-bold">{activeChannel.name}</span>
                  </>
                ) : (
                  <span className="text-slate-400 text-sm">Select a channel to start chatting</span>
                )}
              </div>

              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {activeChannel ? (
                  <>
                    <div className="border-b border-slate-800 pb-6 mb-4">
                      <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-300 mb-3">
                        #
                      </div>
                      <h2 className="text-2xl font-bold text-white">Welcome to #{activeChannel.name}!</h2>
                      <p className="text-slate-400 text-sm mt-1">
                        This is the start of the #{activeChannel.name} channel.
                      </p>
                    </div>

                    {/* Messages Loading State */}
                    {loadingMessages ? (
                      <div className="space-y-4 py-4">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-full bg-slate-900 animate-pulse shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3 bg-slate-900 rounded animate-pulse w-1/4" />
                            <div className="h-4 bg-slate-900 rounded animate-pulse w-3/4" />
                          </div>
                        </div>
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((msg) => {
                        const senderName = msg.sender?.username || 'User'
                        const senderLetter = senderName.charAt(0).toUpperCase()
                        const timeFormatted = msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''

                        return (
                          <div key={msg.id || Math.random()} className="flex items-start gap-3 group hover:bg-slate-900/40 p-2 rounded-lg transition duration-150">
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white shrink-0 mt-0.5">
                              {senderLetter}
                            </div>

                            <div className="flex-1 overflow-hidden">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-white text-sm">{senderName}</span>
                                {timeFormatted && (
                                  <span className="text-[11px] text-slate-500">{timeFormatted}</span>
                                )}
                              </div>

                              <p className="text-slate-200 text-sm mt-0.5 break-words select-text">
                                {msg.content}
                              </p>

                              {msg.isSuspicious && (
                                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium">
                                  <span>⚠️</span>
                                  <span>This link may be unsafe</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      /* Messages Empty State */
                      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                        <div className="text-3xl mb-2">💬</div>
                        <p className="text-base font-semibold text-slate-400">No messages yet — be the first to say hi!</p>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <p className="text-lg">No active channel selected</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={!activeChannel}
                    placeholder={
                      activeChannel ? `Message #${activeChannel.name}` : 'Select a channel first'
                    }
                    className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed select-text"
                  />
                  <button
                    type="submit"
                    disabled={!activeChannel || !messageInput.trim()}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition duration-200 cursor-pointer shrink-0"
                  >
                    Send
                  </button>
                </div>
              </form>
            </main>
          </div>
        )}

        {/* VIEW 2: LIBRARY TAB */}
        {activeTab === 'library' && (
          <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>📚</span> Resource Library
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Access notes, PDFs, and study materials uploaded by server members.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search resources..."
                  className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 max-w-full select-text"
                />

                <button
                  onClick={() => {
                    setIsUploadModalOpen(true)
                    setUploadError('')
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <span>+</span> Upload Resource
                </button>
              </div>
            </div>

            {/* Resources Loading State */}
            {loadingResources ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="h-44 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
                <div className="h-44 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
                <div className="h-44 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
              </div>
            ) : resources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {resources.map((resItem) => {
                  const tagList = resItem.tags ? resItem.tags.split(',').map((t) => t.trim()) : []
                  const uploaderName = resItem.uploader?.username || 'User'

                  return (
                    <div
                      key={resItem.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between shadow-lg transition duration-200"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-white text-base leading-snug break-words">
                            {resItem.title}
                          </h3>
                        </div>

                        {tagList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {tagList.map((tag, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-slate-400 mb-4">
                          Uploaded by <span className="text-slate-200 font-semibold">{uploaderName}</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleUpvote(resItem.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-emerald-600/20 hover:border-emerald-500/40 border border-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg transition cursor-pointer"
                          >
                            <span>👍</span>
                            <span className="font-semibold">{resItem.upvotes}</span>
                          </button>

                          <button
                            onClick={() => handleDownload(resItem.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition cursor-pointer"
                          >
                            <span>📥</span>
                            <span>Download ({resItem.downloads})</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Resources Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="text-5xl mb-3">📁</div>
                <p className="text-lg font-semibold text-slate-300">No resources uploaded yet</p>
                <p className="text-sm mt-1 text-slate-400">
                  {searchQuery ? 'No resources match your search query.' : 'Be the first to share study notes or PDFs with your server!'}
                </p>
              </div>
            )}
          </main>
        )}

        {/* VIEW 3: DOUBTS TAB */}
        {activeTab === 'doubts' && (
          <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>❓</span> Doubts & Q&A Forum
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Ask questions, collaborate on doubts, and earn reputation points.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    onClick={() => setDoubtFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      doubtFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setDoubtFilter('open')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      doubtFilter === 'open'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    onClick={() => setDoubtFilter('solved')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      doubtFilter === 'solved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Solved
                  </button>
                </div>

                <button
                  onClick={() => {
                    setIsAskDoubtModalOpen(true)
                    setAskDoubtError('')
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition cursor-pointer flex items-center gap-2 shrink-0"
                >
                  <span>+</span> Ask a Doubt
                </button>
              </div>
            </div>

            {/* Doubts Loading State */}
            {loadingDoubts ? (
              <div className="space-y-4">
                <div className="h-24 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
                <div className="h-24 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
              </div>
            ) : doubts.length > 0 ? (
              <div className="space-y-4">
                {doubts.map((thread) => {
                  const replyCount = thread.replies ? thread.replies.length : 0
                  const askedByName = thread.askedBy?.username || 'User'

                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 cursor-pointer transition duration-200 shadow-md flex items-center justify-between gap-4 group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {thread.isSolved ? (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                              <span>✓</span> Solved
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                              <span>⏳</span> Open
                            </span>
                          )}

                          <span className="text-xs text-slate-400">
                            Asked by <strong className="text-slate-200">{askedByName}</strong>
                          </span>
                        </div>

                        <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition leading-snug">
                          {thread.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-slate-300 text-sm font-semibold shrink-0">
                        <span>💬</span>
                        <span>{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Doubts Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="text-5xl mb-3">❓</div>
                <p className="text-lg font-semibold text-slate-300">No doubt threads posted yet</p>
                <p className="text-sm mt-1 text-slate-400">
                  {doubtFilter !== 'all' ? `No ${doubtFilter} doubts currently.` : 'Have a question or stuck on a topic? Ask the community!'}
                </p>
              </div>
            )}
          </main>
        )}

        {/* VIEW 4: LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto p-6">
            <div className="border-b border-slate-800 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🏆</span> Gamified Server Leaderboard
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Top members ranked by reputation points earned from helping others and sharing resources.
              </p>
            </div>

            {/* Leaderboard Loading State */}
            {loadingLeaderboard ? (
              <div className="space-y-4 max-w-4xl mx-auto w-full">
                <div className="h-20 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
                <div className="h-20 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
                <div className="h-20 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
              </div>
            ) : leaderboard.length > 0 ? (
              <div className="space-y-4 max-w-4xl mx-auto w-full">
                {leaderboard.map((member, index) => {
                  const rank = index + 1
                  const badgeInfo = getBadgeInfo(member.badge)
                  const isTop1 = rank === 1
                  const isTop2 = rank === 2
                  const isTop3 = rank === 3
                  const isTopThree = isTop1 || isTop2 || isTop3

                  return (
                    <div
                      key={member.userId}
                      className={`p-5 rounded-2xl border transition duration-200 flex items-center justify-between gap-4 ${
                        isTop1
                          ? 'bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/40 shadow-xl shadow-amber-500/10 scale-[1.01]'
                          : isTop2
                          ? 'bg-gradient-to-r from-slate-400/10 via-slate-300/10 to-slate-400/10 border-slate-400/40 shadow-md'
                          : isTop3
                          ? 'bg-gradient-to-r from-amber-700/10 via-amber-600/10 to-amber-700/10 border-amber-600/40 shadow-md'
                          : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                            isTop1
                              ? 'bg-amber-500 text-slate-950 text-xl shadow-md'
                              : isTop2
                              ? 'bg-slate-300 text-slate-950 text-xl shadow-md'
                              : isTop3
                              ? 'bg-amber-700 text-white text-xl shadow-md'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{rank}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-base shrink-0">
                            {member.username ? member.username.charAt(0).toUpperCase() : 'U'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-white ${isTopThree ? 'text-lg' : 'text-base'}`}>
                                {member.username}
                              </span>
                              {isTop1 && <span className="text-xl">👑</span>}
                            </div>
                            <span className="text-xs text-slate-400">
                              Member of {selectedServerDetails?.name || 'Server'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${badgeInfo.bg}`}
                        >
                          <span>{badgeInfo.emoji}</span>
                          <span>{badgeInfo.label}</span>
                        </div>

                        <div className="text-right min-w-[90px]">
                          <div className={`font-black text-blue-400 ${isTopThree ? 'text-xl' : 'text-lg'}`}>
                            {member.totalPoints}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                            Points
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Leaderboard Empty State */
              <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <div className="text-5xl mb-3">🏆</div>
                <p className="text-lg font-semibold text-slate-300">No leaderboard entries yet</p>
                <p className="text-sm mt-1 text-slate-400">Join the server and start earning points to climb the rankings!</p>
              </div>
            )}
          </main>
        )}
      </div>

      {/* CREATE CHANNEL MODAL (ADMIN ONLY) */}
      {isCreateChannelModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-white mb-1">Create Channel</h2>
            <p className="text-slate-400 text-sm mb-4">
              Add a new text channel to {selectedServerDetails?.name || 'this server'}.
            </p>

            {createChannelError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium text-center">
                {createChannelError}
              </div>
            )}

            <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Channel Name *
                </label>
                <input
                  type="text"
                  required
                  value={channelNameInput}
                  onChange={(e) => setChannelNameInput(e.target.value)}
                  placeholder="e.g. announcements, doubts, off-topic"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsCreateChannelModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createChannelLoading || !channelNameInput.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer"
                >
                  {createChannelLoading ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASK A DOUBT MODAL */}
      {isAskDoubtModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-white mb-1">Ask a Doubt</h2>
            <p className="text-slate-400 text-sm mb-4">
              Post a question for the community and get help from members.
            </p>

            {askDoubtError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium text-center">
                {askDoubtError}
              </div>
            )}

            <form onSubmit={handleAskDoubtSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Channel *
                </label>
                <select
                  required
                  value={selectedDoubtChannelId}
                  onChange={(e) => setSelectedDoubtChannelId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {selectedServerDetails?.channels?.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Doubt Title / Question *
                </label>
                <textarea
                  required
                  rows={3}
                  value={doubtTitleInput}
                  onChange={(e) => setDoubtTitleInput(e.target.value)}
                  placeholder="e.g. How do I optimize Dijkstra algorithm time complexity?"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAskDoubtModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={askDoubtLoading || !doubtTitleInput.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer"
                >
                  {askDoubtLoading ? 'Posting...' : 'Post Doubt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THREAD DETAIL MODAL */}
      {selectedThread && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl max-h-[85vh] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700 bg-slate-900/50 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {selectedThread.isSolved ? (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <span>✓</span> Solved
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                      <span>⏳</span> Open
                    </span>
                  )}

                  <span className="text-xs text-slate-400">
                    Asked by <strong className="text-slate-200">{selectedThread.askedBy?.username || 'User'}</strong>
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white leading-snug">
                  {selectedThread.title}
                </h2>
              </div>

              <button
                onClick={() => setSelectedThread(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Replies ({selectedThread.replies ? selectedThread.replies.length : 0})
              </h3>

              {selectedThread.replies && selectedThread.replies.length > 0 ? (
                selectedThread.replies.map((reply) => {
                  const replierName = reply.repliedBy?.username || 'User'
                  const isAccepted = reply.isAcceptedAnswer

                  return (
                    <div
                      key={reply.id}
                      className={`p-4 rounded-xl border transition duration-200 ${
                        isAccepted
                          ? 'bg-emerald-500/10 border-emerald-500/40'
                          : 'bg-slate-900 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{replierName}</span>
                          {isAccepted && (
                            <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span>✓</span> Accepted Answer (+15 pts)
                            </span>
                          )}
                        </div>

                        {!selectedThread.isSolved && (
                          <button
                            onClick={() => handleAcceptAnswer(reply.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition"
                          >
                            Mark as Accepted
                          </button>
                        )}
                      </div>

                      <p className="text-slate-200 text-sm break-words select-text">
                        {reply.content}
                      </p>
                    </div>
                  )
                })
              ) : (
                <div className="text-slate-500 text-sm py-6 text-center italic">
                  No replies yet. Be the first to answer!
                </div>
              )}
            </div>

            <form onSubmit={handleReplySubmit} className="p-4 border-t border-slate-700 bg-slate-900/80">
              {replyError && (
                <div className="mb-2 text-xs text-red-400 text-center">{replyError}</div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={replyContentInput}
                  onChange={(e) => setReplyContentInput(e.target.value)}
                  placeholder="Write your answer..."
                  className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 select-text"
                />
                <button
                  type="submit"
                  disabled={replyLoading || !replyContentInput.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl shadow-md cursor-pointer transition shrink-0"
                >
                  {replyLoading ? 'Posting...' : 'Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD RESOURCE MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6">
            <h2 className="text-xl font-bold text-white mb-1">Upload Resource</h2>
            <p className="text-slate-400 text-sm mb-4">
              Share study notes, PDFs, or code samples with your server.
            </p>

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium text-center">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Binary Search Notes PDF"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="e.g. dsa, algorithms, notes"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  File *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadLoading || !uploadFile}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / JOIN SERVER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex border-b border-slate-700 bg-slate-900/50">
              <button
                onClick={() => {
                  setActiveModalTab('create')
                  setModalError('')
                }}
                className={`flex-1 py-3 text-sm font-semibold transition cursor-pointer ${
                  activeModalTab === 'create'
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Server
              </button>
              <button
                onClick={() => {
                  setActiveModalTab('join')
                  setModalError('')
                }}
                className={`flex-1 py-3 text-sm font-semibold transition cursor-pointer ${
                  activeModalTab === 'join'
                    ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Join Server
              </button>
            </div>

            <div className="p-6">
              {modalError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium text-center">
                  {modalError}
                </div>
              )}

              {activeModalTab === 'create' ? (
                <form onSubmit={handleCreateServer} className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Give your new server a name to get started.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Server Name
                    </label>
                    <input
                      type="text"
                      required
                      value={serverNameInput}
                      onChange={(e) => setServerNameInput(e.target.value)}
                      placeholder="e.g. My Cool Community"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer"
                    >
                      {modalLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinServer} className="space-y-4">
                  <p className="text-slate-400 text-sm">
                    Enter an invite code below to join an existing server.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Invite Code
                    </label>
                    <input
                      type="text"
                      required
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      placeholder="e.g. dsa-study-123"
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-md cursor-pointer"
                    >
                      {modalLoading ? 'Joining...' : 'Join Server'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

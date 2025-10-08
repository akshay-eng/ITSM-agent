import React, { useState, useRef } from 'react';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  Plus, 
  Filter, 
  MoreHorizontal,
  MessageCircle,
  Upload,
  Send,
  Paperclip,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Moon,
  Sun,
  Shield,
  Activity,
  Calendar,
  FileText,
  RefreshCw,
  Eye,
  TrendingUp,
  Users,
  Server,
  Database,
  XCircle,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit3,
  Archive,
  Loader,
  Check,
  GitBranch
} from 'lucide-react';
import IncidentDetails from './IncidentDetails';
import ChangeDetails from './ChangeDetails';
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('incidents');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChange, setSelectedChange] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  
  // AI Chat Bot States
  const [chatSessions, setChatSessions] = useState([
    { 
      id: 1, 
      name: 'ITSM Assistant', 
      messages: [
        { 
          id: 1, 
          type: 'bot', 
          content: 'Hello! I\'m your ServiceNow ITSM AI assistant. I can help you:\n\n• Create incidents with intelligent field inference\n• Find resolution steps for problems\n• Manage change requests\n• Analyze historical data\n\nHow can I assist you today?',
          timestamp: new Date().toISOString()
        }
      ], 
      lastMessage: new Date().toISOString(),
      workflowPath: []
    }
  ]);
  
  const [currentChatSession, setCurrentChatSession] = useState(1);
  const [currentMessage, setCurrentMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Critical Issue Detected', message: 'Production Server Outage requires attention', type: 'critical', time: '2m ago', read: false },
    { id: 2, title: 'Change Approved', message: 'Database Migration has been approved', type: 'success', time: '15m ago', read: false },
    { id: 3, title: 'Incident Resolved', message: 'Network Performance issue resolved', type: 'info', time: '1h ago', read: true },
    { id: 4, title: 'System Maintenance', message: 'Scheduled maintenance window starts in 2 hours', type: 'warning', time: '30m ago', read: false },
    { id: 5, title: 'Security Alert', message: 'Unusual login activity detected', type: 'critical', time: '45m ago', read: true }
  ]);
  const fileInputRef = useRef(null);

  // Backend API URL - update this to match your Flask server
  const API_BASE_URL = 'http://localhost:5019';

  // Dummy incident data
  const incidents = [
    {
      id: 'INC0010011',
      number: 'INC0010011',
      opened: '2025-09-02 02:54:52',
      shortDescription: 'Production Server Outage - Critical Infrastructure Issue',
      description: 'server down in production',
      caller: 'Sarah Wilson',
      priority: 'Critical',
      state: 'New',
      category: 'Infrastructure',
      subcategory: 'Server Hardware',
      assignmentGroup: 'Server Operations',
      assignedTo: 'John Doe',
      updated: '2025-09-19 23:07:27',
      updatedBy: 'system',
      severity: 'critical',
      namespace: 'production',
      pod: 'web-server-01',
      impact: '1 - High',
      urgency: '1 - High',
      service: 'Web Application Service',
      serviceOffering: 'Production Web Hosting',
      configurationItem: 'PROD-WEB-01'
    },
    {
      id: 'INC0010012',
      number: 'INC0010012',
      opened: '2025-09-02 08:15:30',
      shortDescription: 'Network Performance Degradation',
      description: 'Users reporting slow network connectivity',
      caller: 'Mike Johnson',
      priority: 'High',
      state: 'In Progress',
      category: 'Network',
      subcategory: 'Performance',
      assignmentGroup: 'Network Team',
      assignedTo: 'Jane Smith',
      updated: '2025-09-19 16:30:45',
      updatedBy: 'jane.smith',
      severity: 'high',
      namespace: 'production',
      pod: 'network-01',
      impact: '2 - Medium',
      urgency: '2 - Medium',
      service: 'Network Services',
      serviceOffering: 'Corporate Network',
      configurationItem: 'NET-CORE-01'
    }
  ];

  // Enhanced change management data
  const changes = [
    {
      id: 'CHG0030001',
      opened: '2025-09-15 10:30:00',
      shortDescription: 'Database Migration to Cloud Infrastructure - Phase 2',
      type: 'Standard',
      state: 'Scheduled',
      priority: 'High',
      risk: 'Medium',
      assignmentGroup: 'Database Team',
      assignedTo: 'John Smith',
      updated: '2025-09-18 14:22:15',
      updatedBy: 'admin',
      startDate: '2025-09-25 02:00:00',
      endDate: '2025-09-25 06:00:00'
    },
    {
      id: 'CHG0030002',
      opened: '2025-09-14 15:45:00',
      shortDescription: 'Security Patch Deployment - Windows Servers',
      type: 'Emergency',
      state: 'Approved',
      priority: 'Critical',
      risk: 'Low',
      assignmentGroup: 'Security Team',
      assignedTo: 'Sarah Connor',
      updated: '2025-09-17 12:10:30',
      updatedBy: 'security.admin',
      startDate: '2025-09-22 03:00:00',
      endDate: '2025-09-22 05:00:00'
    }
  ];

  // System stats
  const stats = [
    { 
      label: 'Critical Issues', 
      value: incidents.filter(i => i.severity === 'critical' && i.state !== 'Resolved').length.toString(), 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bgColor: isDarkMode ? 'bg-red-900/20' : 'bg-red-50',
      borderColor: isDarkMode ? 'border-red-800' : 'border-red-200'
    },
    { 
      label: 'Pending Changes', 
      value: changes.filter(c => c.state !== 'Completed').length.toString(), 
      icon: Calendar, 
      color: 'text-blue-600', 
      bgColor: isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      borderColor: isDarkMode ? 'border-blue-800' : 'border-blue-200'
    },
    { 
      label: 'Active Incidents', 
      value: incidents.filter(i => i.state !== 'Resolved').length.toString(), 
      icon: Activity, 
      color: 'text-orange-600', 
      bgColor: isDarkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      borderColor: isDarkMode ? 'border-orange-800' : 'border-orange-200'
    },
    { 
      label: 'System Health', 
      value: '94.8%', 
      icon: TrendingUp, 
      color: 'text-green-600', 
      bgColor: isDarkMode ? 'bg-green-900/20' : 'bg-green-50',
      borderColor: isDarkMode ? 'border-green-800' : 'border-green-200'
    }
  ];

  // AI Chat Functions
  const getCurrentChatMessages = () => {
    const session = chatSessions.find(s => s.id === currentChatSession);
    return session ? session.messages : [];
  };

  const sendMessageToBackend = async (message, files = []) => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('message', message);
      formData.append('session_id', currentChatSession.toString());
      
      // Send only the first file (matching working backend)
      if (files.length > 0 && files[0].size > 0) {
        console.log('Attaching file:', files[0].name, 'Size:', files[0].size);
        formData.append('file', files[0]); // Use same field name as working backend
      }
  
      console.log('Sending to backend:', `${API_BASE_URL}/chat`);
      
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
  
      const data = await response.json();
      console.log('Backend response received:', data);
      return data;
    } catch (error) {
      console.error('Error sending message to backend:', error);
      return {
        response: `Connection error: ${error.message}`,
        workflow_path: [],
        pending_confirmation: false
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (currentMessage.trim() || uploadedFiles.length > 0) {
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: currentMessage,
        files: uploadedFiles.map(f => ({ name: f.name, size: f.size })),
        timestamp: new Date().toISOString()
      };

      // Add user message to chat
      setChatSessions(prev => prev.map(session => 
        session.id === currentChatSession 
          ? { 
              ...session, 
              messages: [...session.messages, userMessage],
              lastMessage: new Date().toISOString()
            }
          : session
      ));
      
      // Send to backend
      const backendResponse = await sendMessageToBackend(currentMessage, uploadedFiles);
      
      // Create bot response
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        content: backendResponse.response,
        timestamp: new Date().toISOString(),
        workflowPath: backendResponse.workflow_path || [],
        pendingConfirmation: backendResponse.pending_confirmation || false,
        incidentDetails: backendResponse.incident_details || null
      };

      // Add bot response to chat
      setChatSessions(prev => prev.map(session => 
        session.id === currentChatSession 
          ? { 
              ...session, 
              messages: [...session.messages, botResponse],
              lastMessage: new Date().toISOString(),
              workflowPath: backendResponse.workflow_path || []
            }
          : session
      ));

      // Handle pending confirmation
      if (backendResponse.pending_confirmation) {
        setPendingConfirmation(backendResponse.incident_details);
      } else {
        setPendingConfirmation(null);
      }
      
      setCurrentMessage('');
      setUploadedFiles([]);
    }
  };

  const createNewChatSession = () => {
    const newSession = {
      id: Date.now(),
      name: `ITSM Chat ${chatSessions.length + 1}`,
      messages: [
        { 
          id: 1, 
          type: 'bot', 
          content: 'Hello! I\'m your ITSM assistant. How can I help you today?', 
          timestamp: new Date().toISOString() 
        }
      ],
      lastMessage: new Date().toISOString(),
      workflowPath: []
    };
    setChatSessions(prev => [...prev, newSession]);
    setCurrentChatSession(newSession.id);
  };

  const deleteChatSession = (sessionId) => {
    if (chatSessions.length > 1) {
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentChatSession === sessionId) {
        setCurrentChatSession(chatSessions[0].id);
      }
    }
  };

  // Utility functions
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: isDarkMode ? 'text-red-400 bg-red-900/50 border-red-700' : 'text-red-700 bg-red-50 border-red-200',
      high: isDarkMode ? 'text-orange-400 bg-orange-900/50 border-orange-700' : 'text-orange-700 bg-orange-50 border-orange-200',
      medium: isDarkMode ? 'text-yellow-400 bg-yellow-900/50 border-yellow-700' : 'text-yellow-700 bg-yellow-50 border-yellow-200',
      low: isDarkMode ? 'text-green-400 bg-green-900/50 border-green-700' : 'text-green-700 bg-green-50 border-green-200'
    };
    return colors[severity?.toLowerCase()] || (isDarkMode ? 'text-gray-400 bg-gray-800/50 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200');
  };

  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case 'new': return isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200';
      case 'on hold': return isDarkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'in progress': return isDarkMode ? 'bg-orange-900/30 text-orange-300 border-orange-700' : 'bg-orange-50 text-orange-700 border-orange-200';
      case 'resolved': return isDarkMode ? 'bg-green-900/30 text-green-300 border-green-700' : 'bg-green-50 text-green-700 border-green-200';
      case 'scheduled': return isDarkMode ? 'bg-purple-900/30 text-purple-300 border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200';
      case 'approved': return isDarkMode ? 'bg-emerald-900/30 text-emerald-300 border-emerald-700' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in review': return isDarkMode ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
  };

  const handleChangeClick = (change) => {
    setSelectedChange(change);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    console.log('=== FILE SELECTION DEBUG ===');
    
    files.forEach((file, index) => {
      console.log(`File ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Check if file is empty
      if (file.size === 0) {
        alert(`Warning: File "${file.name}" is empty (0 bytes). Please check the file content.`);
        return; // Don't add empty files
      }
    });
    
    // Only add non-empty files
    const validFiles = files.filter(file => file.size > 0);
    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      console.log('Valid files added:', validFiles.length);
    } else {
      alert('No valid files selected. All files were empty.');
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ));
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const filteredIncidents = incidents.filter(incident =>
    incident.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    incident.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredChanges = changes.filter(change =>
    change.shortDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    change.id.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (selectedIncident) {
    return (
      <IncidentDetails
        incident={selectedIncident}
        onBack={() => setSelectedIncident(null)}
        isDarkMode={isDarkMode}
      />
    );
  }
   
  if (selectedChange) {
    return (
      <ChangeDetails
        change={selectedChange}
        onBack={() => setSelectedChange(null)}
        isDarkMode={isDarkMode}
      />
    );
  }

  const currentStatus = incidents.some(i => i.severity === 'critical' && i.state !== 'Resolved') ? 'critical' :
                      incidents.some(i => i.severity === 'high' && i.state !== 'Resolved') ? 'warning' : 'healthy';

  const themeClass = isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50';
  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClass}`}>
      {/* Header */}
      <header className={`${cardClass} border-b px-6 py-4 transition-colors duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className={`text-xl font-bold ${textClass}`}>ServiceNow</h1>
                  <p className={`text-xs ${textSecondaryClass}`}>Enterprise Platform</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <div className={`w-2 h-2 rounded-full ${
                  currentStatus === 'critical' ? 'bg-red-500' : 
                  currentStatus === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}></div>
                <span className={`text-sm font-medium ${
                  currentStatus === 'critical' ? 'text-red-600' : 
                  currentStatus === 'warning' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {currentStatus.toUpperCase()}
                </span>
              </div>
            </div>
            
            <nav className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {[
                { id: 'incidents', label: 'Incidents', icon: Activity },
                { id: 'changes', label: 'Changes', icon: Calendar },
                { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id 
                      ? isDarkMode ? 'bg-gray-600 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm'
                      : isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                className={`pl-10 pr-4 py-2 w-80 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                isMonitoring 
                  ? isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700' 
                  : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isMonitoring ? 'Active' : 'Paused'}</span>
            </button>
            
            <button 
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-6">
        {activeTab === 'incidents' && (
          <div className="w-full h-full">
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className={`text-lg font-semibold ${textClass}`}>Incident Management</h2>
                    <p className={`text-sm ${textSecondaryClass}`}>Track and resolve system incidents</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className={`flex items-center px-3 py-2 text-sm border rounded-lg transition-colors ${
                    isDarkMode ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600' : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'
                  }`}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </button>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    New Incident
                  </button>
                </div>
              </div>
            </div>
            
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <tr>
                    {['Number', 'Opened', 'Description', 'Caller', 'Priority', 'State', 'Assignment Group', 'Assigned To', 'Updated', 'Actions'].map((header) => (
                      <th key={header} className={`px-6 py-3 text-left text-xs font-semibold ${textSecondaryClass} uppercase tracking-wider`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className={`transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                    }`} onClick={() => handleIncidentClick(incident)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-blue-600 font-medium hover:text-blue-800">
                          {incident.id}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textSecondaryClass}`}>
                        {incident.opened.split(' ')[0]}
                      </td>
                      <td className={`px-6 py-4 text-sm ${textClass} max-w-xs`}>
                        <div className="font-medium">{incident.shortDescription}</div>
                        <div className={`text-xs ${textSecondaryClass} mt-1`}>{incident.category}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                        {incident.caller}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getPriorityIcon(incident.priority)}
                          <span className={`text-sm ${textClass}`}>{incident.priority}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStateColor(incident.state)}`}>
                          {incident.state}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                        {incident.assignmentGroup}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                        {incident.assignedTo}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textSecondaryClass}`}>
                        {incident.updated.split(' ')[0]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'changes' && (
          <div className="w-full">
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <h2 className={`text-lg font-semibold ${textClass}`}>Change Management</h2>
                    <p className={`text-sm ${textSecondaryClass}`}>Plan and approve system changes</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button className={`flex items-center px-3 py-2 text-sm border rounded-lg transition-colors ${
                    isDarkMode ? 'text-gray-300 bg-gray-700 border-gray-600 hover:bg-gray-600' : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'
                  }`}>
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </button>
                  <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    New Change
                  </button>
                </div>
              </div>
            </div>
            
            <div className="w-full overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <tr>
                    {['Number', 'Opened', 'Description', 'Type', 'State', 'Priority', 'Risk', 'Assignment Group', 'Assigned To', 'Actions'].map((header) => (
                      <th key={header} className={`px-6 py-3 text-left text-xs font-semibold ${textSecondaryClass} uppercase tracking-wider`}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredChanges.map((change) => (
                    <tr key={change.id} className={`transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                    }`} onClick={() => handleChangeClick(change)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-blue-600 font-medium hover:text-blue-800 cursor-pointer">
                          {change.id}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textSecondaryClass}`}>
                        {change.opened.split(' ')[0]}
                      </td>
                      <td className={`px-6 py-4 text-sm ${textClass} max-w-xs`}>
                        <div className="font-medium">{change.shortDescription}</div>
                        {change.startDate && (
                          <div className={`text-xs ${textSecondaryClass} mt-1`}>
                            Scheduled: {new Date(change.startDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${
                          change.type === 'Emergency' ? (isDarkMode ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200') :
                          change.type === 'Standard' ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200') :
                          (isDarkMode ? 'bg-gray-800 text-gray-300 border-gray-600' : 'bg-gray-50 text-gray-700 border-gray-200')
                        }`}>
                          {change.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStateColor(change.state)}`}>
                          {change.state}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                        {change.priority}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${
                          change.risk === 'High' ? (isDarkMode ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200') :
                          change.risk === 'Medium' ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-yellow-50 text-yellow-700 border-yellow-200') :
                          (isDarkMode ? 'bg-green-900/30 text-green-300 border-green-700' : 'bg-green-50 text-green-700 border-green-200')
                        }`}>
                          {change.risk}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                        {change.assignmentGroup}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>
                        {change.assignedTo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className={`p-1 rounded transition-colors ${
                          isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'chatbot' && (
           <div className="fixed inset-0 pt-20 flex">
           {/* Chat Sidebar */}
           <div className={`w-80 ${cardClass} border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold ${textClass}`}>AI Assistant Sessions</h3>
                  <button
                    onClick={createNewChatSession}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Connection Status */}
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                  isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className={`text-sm ${textSecondaryClass}`}>
                    Connected to ITSM Backend
                  </span>
                </div>
              </div>
              
              <div className="overflow-y-auto h-full">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setCurrentChatSession(session.id)}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-200 hover:bg-gray-50'
                    } ${
                      currentChatSession === session.id 
                        ? isDarkMode ? 'bg-gray-700/50' : 'bg-blue-50' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium truncate ${textClass}`}>{session.name}</h4>
                        <p className={`text-xs ${textSecondaryClass} mt-1`}>
                          {session.messages.length} messages
                        </p>
                        <p className={`text-xs ${textSecondaryClass}`}>
                          {new Date(session.lastMessage).toLocaleTimeString()}
                        </p>
                        
                        {/* Workflow Path Display */}
                        {session.workflowPath && session.workflowPath.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-1">
                              <GitBranch className="w-3 h-3 text-blue-500" />
                              <span className={`text-xs ${textSecondaryClass}`}>
                                {session.workflowPath.join(' → ')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt('Enter new name:', session.name);
                            if (newName) {
                              setChatSessions(prev => prev.map(s => 
                                s.id === session.id ? { ...s, name: newName } : s
                              ));
                            }
                          }}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {chatSessions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChatSession(session.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              isDarkMode ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Interface */}
            <div className={`flex-1 ${cardClass} rounded-r-lg flex flex-col`}>
              <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <h2 className={`text-lg font-semibold ${textClass}`}>
                        {chatSessions.find(s => s.id === currentChatSession)?.name || 'ITSM Assistant'}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className={`text-sm ${textSecondaryClass}`}>
                          AI-Powered ServiceNow Assistant
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Enhanced ITSM</span>
                    </div>
                    {/* Quick Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentMessage('Create an incident with description: ')}
                        className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                          isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        New Incident
                      </button>
                      <button
                        onClick={() => setCurrentMessage('Get resolution steps for ')}
                        className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                          isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Get Resolution
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {getCurrentChatMessages().map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-2xl px-4 py-3 rounded-lg shadow-sm transition-all duration-200 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : isDarkMode ? 'bg-gray-700 text-gray-100 border border-gray-600' : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                      {message.type === 'bot' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <MessageCircle className="w-3 h-3 text-white" />
                          </div>
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            ITSM Assistant
                          </span>
                          {message.workflowPath && message.workflowPath.length > 0 && (
                            <div className="flex items-center space-x-1 ml-2">
                              <GitBranch className="w-3 h-3 text-blue-500" />
                              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {message.workflowPath.join(' → ')}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>
                      
                      {/* Pending Confirmation UI */}
                      {message.pendingConfirmation && message.incidentDetails && (
                        <div className={`mt-4 p-3 rounded-lg border ${
                          isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
                        }`}>
                          <h4 className={`font-medium mb-2 ${textClass}`}>Incident Details Ready for Confirmation:</h4>
                          <div className="space-y-1 text-sm">
                            {Object.entries(message.incidentDetails).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className={`capitalize ${textSecondaryClass}`}>{key.replace('_', ' ')}:</span>
                                <span className={textClass}>{value}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <button
                              onClick={() => setCurrentMessage('Yes, create the incident with these details')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                            >
                              Approve & Create
                            </button>
                            <button
                              onClick={() => setCurrentMessage('Change priority to ')}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                isDarkMode ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              Modify
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {message.files && message.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.files.map((file, index) => (
                            <div key={index} className={`flex items-center space-x-2 px-3 py-2 rounded ${
                              message.type === 'user' ? 'bg-white/20' : isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                            }`}>
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs opacity-70">({(file.size / 1024).toFixed(1)}KB)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Loading Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className={`max-w-2xl px-4 py-3 rounded-lg shadow-sm ${
                      isDarkMode ? 'bg-gray-700 text-gray-100 border border-gray-600' : 'bg-white text-gray-900 border border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <MessageCircle className="w-3 h-3 text-white" />
                        </div>
                        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ITSM Assistant
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Loader className="w-4 h-4 animate-spin text-blue-600" />
                        <span className={textSecondaryClass}>Processing your request...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* File Upload Preview */}
              {uploadedFiles.length > 0 && (
                <div className={`px-6 py-3 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span className={`text-sm ${textClass}`}>{file.name}</span>
                        <span className={`text-xs ${textSecondaryClass}`}>({(file.size / 1024).toFixed(1)}KB)</span>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Message Input */}
              <div className={`sticky bottom-0 p-6 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
                    }`}
                    disabled={isLoading}
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Try: 'Create incident with description: PVC stuck pending' or 'Get resolution for INC0010011'"
                    className={`flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={(!currentMessage.trim() && uploadedFiles.length === 0) || isLoading}
                  >
                    {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                <div className="flex items-center justify-center mt-2">
                  <p className={`text-xs ${textSecondaryClass}`}>
                    Enhanced ITSM AI • Incident Creation • Change Management • Resolution Analysis
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Critical Issues Alert Banner */}
      {incidents.filter(i => i.severity === 'critical' && i.state !== 'Resolved').length > 0 && (
        <div className={`fixed bottom-4 left-4 p-4 rounded-lg shadow-lg max-w-sm border ${
          isDarkMode ? 'bg-red-900 text-red-100 border-red-700' : 'bg-red-600 text-white border-red-500'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">
              {incidents.filter(i => i.severity === 'critical' && i.state !== 'Resolved').length} Critical Issues
            </span>
          </div>
          <p className="text-sm mt-1">Immediate attention required</p>
          <button 
            className="text-sm underline mt-2"
            onClick={() => setActiveTab('incidents')}
          >
            View Details
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
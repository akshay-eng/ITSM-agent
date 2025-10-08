import React, { useState } from 'react';
import { 
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar,
  Tag,
  FileText,
  Activity,
  Search,
  MessageSquare,
  Edit,
  Save,
  X,
  Plus,
  Link,
  Eye,
  Filter,
  Paperclip,
  Send
} from 'lucide-react';

const IncidentDetails = ({ incident, onBack, isDarkMode }) => {
    
  const [activeTab, setActiveTab] = useState('notes');
  const [isEditing, setIsEditing] = useState(false);
  const [workNotes, setWorkNotes] = useState('');
  const [additionalComments, setAdditionalComments] = useState(false);
  
  const [incidentData, setIncidentData] = useState(incident);
  const [activities] = useState([
    {
      id: 1,
      user: 'System Administrator',
      action: 'Field changes',
      timestamp: '2025-09-02 02:54:52',
      changes: {
        'Impact': '1 - High',
        'Incident state': 'New',
        'Opened by': 'System Administrator',
        'Priority': '1 - Critical'
      }
    }
  ]);

  const themeClass = isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50';
  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  const getPriorityColor = (priority) => {
    if (priority?.includes('Critical')) return 'text-red-600 bg-red-50 border-red-200';
    if (priority?.includes('High')) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (priority?.includes('Medium')) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStateColor = (state) => {
    switch (state?.toLowerCase()) {
      case 'new': return isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700';
      case 'in progress': return isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-50 text-orange-700';
      case 'on hold': return isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700';
      case 'resolved': return isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700';
      default: return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700';
    }
  };

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
  };

  const handleWorkNotesSubmit = () => {
    if (workNotes.trim()) {
      // Add work notes logic here
      setWorkNotes('');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${themeClass}`}>
      {/* Header */}
      <header className={`${cardClass} border-b px-6 py-4 transition-colors duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-xl font-bold ${textClass}`}>
                Incident {incidentData.number}
              </h1>
              <p className={`text-sm ${textSecondaryClass}`}>{incidentData.shortDescription}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Discuss
            </button>
            <button className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
              Follow
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Cancel' : 'Update'}
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Resolve
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Incident Details Form */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Number
                    </label>
                    <input
                      type="text"
                      value={incidentData.number}
                      disabled
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Caller <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={incidentData.caller}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Category
                    </label>
                    <select
                      value={incidentData.category}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Software">Software</option>
                      <option value="Hardware">Hardware</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Subcategory
                    </label>
                    <select
                      value={incidentData.subcategory || ''}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="">-- None --</option>
                      <option value="Server Hardware">Server Hardware</option>
                      <option value="Network">Network</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Service
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={incidentData.service || ''}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Service offering
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={incidentData.serviceOffering || ''}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Configuration item
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={incidentData.configurationItem || ''}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Channel
                    </label>
                    <select
                      value="-- None --"
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="-- None --">-- None --</option>
                      <option value="Email">Email</option>
                      <option value="Phone">Phone</option>
                      <option value="Portal">Portal</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      State
                    </label>
                    <select
                      value={incidentData.state}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Impact
                    </label>
                    <select
                      value={incidentData.impact}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="1 - High">1 - High</option>
                      <option value="2 - Medium">2 - Medium</option>
                      <option value="3 - Low">3 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Urgency
                    </label>
                    <select
                      value={incidentData.urgency}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="1 - High">1 - High</option>
                      <option value="2 - Medium">2 - Medium</option>
                      <option value="3 - Low">3 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Priority
                    </label>
                    <input
                      type="text"
                      value="1 - Critical"
                      disabled
                      className={`w-full px-3 py-2 border rounded-lg text-blue-600 font-medium ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Assignment group
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={incidentData.assignmentGroup}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Assigned to
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={incidentData.assignedTo}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Fields */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                    Short description <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={incidentData.shortDescription}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 pr-10 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                      <Link className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                    Description
                  </label>
                  <textarea
                    value={incidentData.description}
                    readOnly={!isEditing}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex items-center justify-end space-x-3">
                  <button
                    onClick={() => setIsEditing(false)}
                    className={`px-4 py-2 border rounded-lg transition-colors ${
                      isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Related Search Results */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <button className="w-full text-center py-2 text-blue-600 hover:text-blue-700 transition-colors">
                Related Search Results →
              </button>
            </div>

            {/* Tabs Section */}
            <div className={`${cardClass} rounded-lg border overflow-hidden`}>
              {/* Tab Navigation */}
              <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {[
                  { id: 'notes', label: 'Notes', icon: FileText },
                  { id: 'related', label: 'Related Records', icon: Link },
                  { id: 'resolution', label: 'Resolution Information', icon: CheckCircle }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? isDarkMode ? 'bg-gray-700 text-white border-b-2 border-blue-500' : 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                        : isDarkMode ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'notes' && (
                  <div className="space-y-6">
                    {/* Watch List and Work Notes List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`font-medium ${textClass}`}>Watch list</h3>
                          <div className="flex items-center space-x-2">
                            <button className={`p-1 rounded transition-colors ${
                              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}>
                              <User className="w-4 h-4" />
                            </button>
                            <button className={`p-1 rounded transition-colors ${
                              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}>
                              <Link className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <p className={`text-sm ${textSecondaryClass} text-center`}>No watchers added</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`font-medium ${textClass}`}>Work notes list</h3>
                          <div className="flex items-center space-x-2">
                            <button className={`p-1 rounded transition-colors ${
                              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}>
                              <User className="w-4 h-4" />
                            </button>
                            <button className={`p-1 rounded transition-colors ${
                              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                            }`}>
                              <Link className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className={`border rounded-lg p-4 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <p className={`text-sm ${textSecondaryClass} text-center`}>No work notes added</p>
                        </div>
                      </div>
                    </div>

                    {/* Work Notes Input */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`font-medium ${textClass}`}>Work notes</h3>
                        <button className={`p-1 rounded transition-colors ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}>
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className={`border rounded-lg ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <div className={`bg-yellow-100 dark:bg-yellow-900/20 px-4 py-2 border-b ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                          <span className="text-sm text-yellow-800 dark:text-yellow-300">Work notes</span>
                        </div>
                        <textarea
                          value={workNotes}
                          onChange={(e) => setWorkNotes(e.target.value)}
                          placeholder="Enter work notes..."
                          rows={6}
                          className={`w-full px-4 py-3 bg-transparent border-0 focus:outline-none resize-none ${
                            isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={additionalComments}
                              onChange={(e) => setAdditionalComments(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <span className={`text-sm ${textSecondaryClass}`}>
                              Additional comments (Customer visible)
                            </span>
                          </label>
                        </div>
                        <button
                          onClick={handleWorkNotesSubmit}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'related' && (
                  <div className={`text-center py-8 ${textSecondaryClass}`}>
                    <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No related records found</p>
                  </div>
                )}

                {activeTab === 'resolution' && (
                  <div className={`text-center py-8 ${textSecondaryClass}`}>
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No resolution information available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Status Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>State</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStateColor(incidentData.state)}`}>
                    {incidentData.state}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Priority</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(incidentData.priority)}`}>
                    {incidentData.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Impact</span>
                  <span className={`text-sm ${textClass}`}>{incidentData.impact}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Urgency</span>
                  <span className={`text-sm ${textClass}`}>{incidentData.urgency}</span>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Assignment</h3>
              <div className="space-y-4">
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Assignment Group</span>
                  <span className={`text-sm ${textClass}`}>{incidentData.assignmentGroup}</span>
                </div>
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Assigned To</span>
                  <span className={`text-sm ${textClass}`}>{incidentData.assignedTo}</span>
                </div>
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Caller</span>
                  <span className={`text-sm ${textClass}`}>{incidentData.caller}</span>
                </div>
              </div>
            </div>

            {/* Activities */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-medium ${textClass}`}>Activities: {activities.length}</h3>
                <button className={`p-1 rounded transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                }`}>
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className={`border-l-4 border-blue-500 pl-4 py-2`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <User className="w-3 h-3 text-white" />
                      </div>
                      <span className={`text-sm font-medium ${textClass}`}>{activity.user}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs ${textSecondaryClass}`}>{activity.action}</span>
                        <span className={`text-xs ${textSecondaryClass}`}>•</span>
                        <span className={`text-xs ${textSecondaryClass}`}>{activity.timestamp}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {Object.entries(activity.changes).map(([field, value]) => (
                          <div key={field} className={`text-xs ${textSecondaryClass}`}>
                            <span className="font-medium">{field}:</span> {value}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
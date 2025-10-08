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
  MessageSquare,
  Edit,
  Save,
  X,
  Plus,
  Link,
  Eye,
  Filter,
  Paperclip,
  Send,
  Search,
  Info
} from 'lucide-react';

const ChangeDetails = ({ change, onBack, isDarkMode }) => {
  const [activeTab, setActiveTab] = useState('planning');
  const [isEditing, setIsEditing] = useState(false);
  
  const [changeData, setChangeData] = useState({
    ...change,
    number: change.id,
    requestedBy: 'David Loo',
    category: 'Software',
    service: '',
    serviceOffering: '',
    configurationItem: 'Sales Force Automation',
    priority: '3 - Moderate',
    risk: 'High',
    impact: '3 - Low',
    shortDescription: 'Rollback Oracle Version',
    description: `Performance of the Siebel SFA software has been severely degraded since the upgrade performed this weekend.

We moved to an unsupported Oracle DB version. Need to rollback the Oracle Instance to a supported version.`,
    model: 'Normal',
    type: 'Normal',
    state: 'New',
    conflictStatus: '-- None --',
    conflictLastRun: '',
    assignmentGroup: '',
    assignedTo: 'ITIL User',
    justification: '',
    implementationPlan: '',
    riskAndImpactAnalysis: '',
    backoutPlan: 'Current prod environment to be snapshotted with VmWare prior to change.'
  });

  const themeClass = isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50';
  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const textClass = isDarkMode ? 'text-gray-100' : 'text-gray-900';
  const textSecondaryClass = isDarkMode ? 'text-gray-300' : 'text-gray-600';

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700';
      case 'assess': return isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700';
      case 'authorize': return isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-50 text-yellow-700';
      case 'scheduled': return isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700';
      case 'implement': return isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-50 text-orange-700';
      case 'review': return isDarkMode ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-700';
      case 'closed': return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700';
      case 'cancelled': return isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-700';
      default: return isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-700';
    }
  };

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return isDarkMode ? 'text-red-400 bg-red-900/50' : 'text-red-700 bg-red-50';
      case 'medium': return isDarkMode ? 'text-yellow-400 bg-yellow-900/50' : 'text-yellow-700 bg-yellow-50';
      case 'low': return isDarkMode ? 'text-green-400 bg-green-900/50' : 'text-green-700 bg-green-50';
      default: return isDarkMode ? 'text-gray-400 bg-gray-800/50' : 'text-gray-600 bg-gray-50';
    }
  };

  const workflowSteps = [
    { id: 'new', label: 'New', active: true, completed: false },
    { id: 'assess', label: 'Assess', active: false, completed: false },
    { id: 'authorize', label: 'Authorize', active: false, completed: false },
    { id: 'scheduled', label: 'Scheduled', active: false, completed: false },
    { id: 'implement', label: 'Implement', active: false, completed: false },
    { id: 'review', label: 'Review', active: false, completed: false },
    { id: 'closed', label: 'Closed', active: false, completed: false },
    { id: 'cancelled', label: 'Cancelled', active: false, completed: false }
  ];

  const handleSave = () => {
    setIsEditing(false);
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
                Change {changeData.number}
              </h1>
              <p className={`text-sm ${textSecondaryClass}`}>{changeData.shortDescription}</p>
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
              Approve
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Reject
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Workflow Status Bar */}
        <div className={`${cardClass} rounded-lg border p-4 mb-6`}>
          <div className="flex items-center justify-between">
            {workflowSteps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                    step.active 
                      ? 'bg-green-600 text-white' 
                      : step.completed 
                      ? 'bg-gray-400 text-white' 
                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <span className={`text-xs mt-1 ${
                    step.active ? textClass : textSecondaryClass
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < workflowSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step.completed ? 'bg-green-600' : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Change Details Form */}
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
                      value={changeData.number}
                      disabled
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Requested by
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={changeData.requestedBy}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1">
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Category
                    </label>
                    <select
                      value={changeData.category}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="Software">Software</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Infrastructure">Infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Service
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={changeData.service}
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
                      Service offering
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={changeData.serviceOffering}
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
                      Configuration item
                    </label>
                    <div className="relative flex">
                      <input
                        type="text"
                        value={changeData.configurationItem}
                        readOnly={!isEditing}
                        className={`flex-1 px-3 py-2 border rounded-l-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="px-3 py-2 border-t border-r border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="px-3 py-2 border-t border-r border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="px-3 py-2 border-t border-r border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                        <FileText className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="px-3 py-2 border-t border-r border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-r-lg">
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Priority
                    </label>
                    <select
                      value={changeData.priority}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="1 - Critical">1 - Critical</option>
                      <option value="2 - High">2 - High</option>
                      <option value="3 - Moderate">3 - Moderate</option>
                      <option value="4 - Low">4 - Low</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Risk
                    </label>
                    <select
                      value={changeData.risk}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Impact
                    </label>
                    <select
                      value={changeData.impact}
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
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Model
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={changeData.model}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1">
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Type
                    </label>
                    <input
                      type="text"
                      value={changeData.type}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      State
                    </label>
                    <input
                      type="text"
                      value={changeData.state}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Conflict status
                    </label>
                    <input
                      type="text"
                      value={changeData.conflictStatus}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Conflict last run
                    </label>
                    <input
                      type="text"
                      value={changeData.conflictLastRun}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                      Assignment group
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={changeData.assignmentGroup}
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
                      Assigned to
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={changeData.assignedTo}
                        readOnly={!isEditing}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                      <button className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1">
                        <Search className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Fields */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                    Short description
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={changeData.shortDescription}
                      readOnly={!isEditing}
                      className={`w-full px-3 py-2 pr-16 border rounded-lg ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                    />
                    <button className="absolute right-8 top-1/2 transform -translate-y-1/2 p-1">
                      <Link className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                    Description
                  </label>
                  <textarea
                    value={changeData.description}
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

            {/* Tabs Section */}
            <div className={`${cardClass} rounded-lg border overflow-hidden`}>
              {/* Tab Navigation */}
              <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                {[
                  { id: 'planning', label: 'Planning', icon: Calendar },
                  { id: 'schedule', label: 'Schedule', icon: Clock },
                  { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
                  { id: 'notes', label: 'Notes', icon: FileText },
                  { id: 'closure', label: 'Closure Information', icon: CheckCircle }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? isDarkMode ? 'bg-gray-700 text-white border-b-2 border-green-500' : 'bg-green-50 text-green-600 border-b-2 border-green-500'
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
                {activeTab === 'planning' && (
                  <div className="space-y-6">
                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                        Justification
                      </label>
                      <textarea
                        value={changeData.justification}
                        readOnly={!isEditing}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                        placeholder="Enter justification for this change..."
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                        Implementation plan
                      </label>
                      <textarea
                        value={changeData.implementationPlan}
                        readOnly={!isEditing}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                        placeholder="Describe the implementation plan..."
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                        Risk and impact analysis
                      </label>
                      <textarea
                        value={changeData.riskAndImpactAnalysis}
                        readOnly={!isEditing}
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                        placeholder="Analyze risks and impacts..."
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${textSecondaryClass} mb-2`}>
                        Backout plan
                      </label>
                      <textarea
                        value={changeData.backoutPlan}
                        readOnly={!isEditing}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                        } ${!isEditing ? 'cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'schedule' && (
                  <div className={`text-center py-8 ${textSecondaryClass}`}>
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No schedule information available</p>
                  </div>
                )}

                {activeTab === 'conflicts' && (
                  <div className={`text-center py-8 ${textSecondaryClass}`}>
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No conflicts detected</p>
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className={`text-center py-8 ${textSecondaryClass}`}>
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No notes available</p>
                  </div>
                )}

                {activeTab === 'closure' && (
                  <div className={`text-center py-8 ${textSecondaryClass}`}>
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Change not yet closed</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Change Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>State</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(changeData.state)}`}>
                    {changeData.state}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Priority</span>
                  <span className={`text-sm ${textClass}`}>{changeData.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Risk</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getRiskColor(changeData.risk)}`}>
                    {changeData.risk}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Impact</span>
                  <span className={`text-sm ${textClass}`}>{changeData.impact}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Type</span>
                  <span className={`text-sm ${textClass}`}>{changeData.type}</span>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Assignment</h3>
              <div className="space-y-4">
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Requested By</span>
                  <span className={`text-sm ${textClass}`}>{changeData.requestedBy}</span>
                </div>
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Assignment Group</span>
                  <span className={`text-sm ${textClass}`}>
                    {changeData.assignmentGroup || 'Not assigned'}
                  </span>
                </div>
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Assigned To</span>
                  <span className={`text-sm ${textClass}`}>{changeData.assignedTo}</span>
                </div>
              </div>
            </div>

            {/* Configuration Item */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Configuration</h3>
              <div className="space-y-4">
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Configuration Item</span>
                  <span className={`text-sm ${textClass}`}>{changeData.configurationItem}</span>
                </div>
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Category</span>
                  <span className={`text-sm ${textClass}`}>{changeData.category}</span>
                </div>
                <div>
                  <span className={`text-sm ${textSecondaryClass} block mb-1`}>Model</span>
                  <span className={`text-sm ${textClass}`}>{changeData.model}</span>
                </div>
              </div>
            </div>

            {/* Approval Status */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Approval Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>CAB Approval</span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    Pending
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Manager Approval</span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Not Required
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${textSecondaryClass}`}>Technical Approval</span>
                  <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Recent Activities</h3>
              <div className="space-y-3">
                <div className={`border-l-4 border-blue-500 pl-4 py-2`}>
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-3 h-3 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${textClass}`}>System Administrator</span>
                  </div>
                  <div className={`text-xs ${textSecondaryClass}`}>
                    Change created • {new Date(change.opened).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`${cardClass} rounded-lg border p-6`}>
              <h3 className={`font-medium ${textClass} mb-4`}>Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                  Approve Change
                </button>
                <button className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                  Reject Change
                </button>
                <button className={`w-full px-4 py-2 border rounded-lg transition-colors text-sm ${
                  isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                  Request Information
                </button>
                <button className={`w-full px-4 py-2 border rounded-lg transition-colors text-sm ${
                  isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}>
                  Schedule Change
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeDetails;
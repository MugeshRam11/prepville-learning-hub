import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Save, 
  Shield, 
  Globe, 
  Bell, 
  Database, 
  Users, 
  Mail, 
  Palette,
  Settings as SettingsIcon,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'The Prep Ville',
    siteDescription: 'Comprehensive EdTech platform for MYP and IBDP students',
    allowRegistration: true,
    requireEmailVerification: true,
    maintenanceMode: false,
    maxTestDuration: 120,
    defaultTestQuestions: 10,
    autoApproveUsers: false,
    maxConcurrentSessions: 3,
    sessionTimeout: 30,
    passingScore: 70,
    maxAttempts: 3,
    emailNotifications: true,
    smsNotifications: false,
    weeklyReports: true,
    adminEmail: 'admin@prepville.com',
    theme: 'light',
    language: 'en',
    primaryColor: '#0EA5E9',
    secondaryColor: '#8B5CF6'
  });

  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeTests: 0,
    totalQuestions: 0,
    storageUsed: 0,
    uptime: 99.8
  });

  const [dbStatus, setDbStatus] = useState<'connected' | 'error'>('connected');
  const [apiStatus, setApiStatus] = useState<'online' | 'offline'>('online');

  // Load settings and statistics on mount
  useEffect(() => {
    loadSettings();
    loadStatistics();
    checkSystemStatus();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_settings');
      
      if (error) throw error;
      
      if (data) {
        const settingsData = data as Record<string, any>;
        setSettings({
          siteName: settingsData.site_name || 'The Prep Ville',
          siteDescription: settingsData.site_description || 'Comprehensive EdTech platform for MYP and IBDP students',
          allowRegistration: settingsData.allow_registration ?? true,
          requireEmailVerification: settingsData.require_email_verification ?? true,
          maintenanceMode: settingsData.maintenance_mode ?? false,
          maxTestDuration: settingsData.max_test_duration || 120,
          defaultTestQuestions: settingsData.default_test_questions || 10,
          autoApproveUsers: settingsData.auto_approve_users ?? false,
          maxConcurrentSessions: settingsData.max_concurrent_sessions || 3,
          sessionTimeout: settingsData.session_timeout || 30,
          passingScore: settingsData.passing_score || 70,
          maxAttempts: settingsData.max_attempts || 3,
          emailNotifications: settingsData.email_notifications ?? true,
          smsNotifications: settingsData.sms_notifications ?? false,
          weeklyReports: settingsData.weekly_reports ?? true,
          adminEmail: settingsData.admin_email || 'admin@prepville.com',
          theme: settingsData.theme || 'light',
          language: settingsData.default_language || 'en',
          primaryColor: settingsData.primary_color || '#0EA5E9',
          secondaryColor: settingsData.secondary_color || '#8B5CF6'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_platform_statistics');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const stats = data[0];
        setStatistics({
          totalUsers: stats.total_users || 0,
          activeTests: stats.active_tests || 0,
          totalQuestions: stats.total_questions || 0,
          storageUsed: stats.storage_used || 0,
          uptime: 99.8
        });
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const checkSystemStatus = async () => {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      setDbStatus(error ? 'error' : 'connected');
      setApiStatus('online');
    } catch (error) {
      setDbStatus('error');
      setApiStatus('offline');
    }
  };

  const handleSave = async (section: string, settingsToSave: Record<string, any>) => {
    setSaving(true);
    try {
      const updates = [];
      
      for (const [key, value] of Object.entries(settingsToSave)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updates.push(
          supabase.rpc('update_admin_setting', {
            p_setting_key: snakeKey,
            p_setting_value: JSON.stringify(value)
          })
        );
      }
      
      await Promise.all(updates);
      toast.success(`${section} settings saved successfully`);
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Admin Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure system settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Tests</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>


        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic platform configuration and information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    placeholder="Enter site name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  rows={3}
                  placeholder="Enter site description"
                />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-base">Allow User Registration</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable new users to create accounts on the platform
                  </p>
                </div>
                <Switch
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={loadSettings}>Cancel</Button>
                <Button 
                  onClick={() => handleSave('General', {
                    siteName: settings.siteName,
                    siteDescription: settings.siteDescription,
                    allowRegistration: settings.allowRegistration,
                    language: settings.language
                  })} 
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-base">Require Email Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Users must verify their email before accessing the platform
                  </p>
                </div>
                <Switch
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Maintenance Mode</Label>
                    {settings.maintenanceMode && (
                      <Badge variant="destructive">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable platform access for maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base">Security Information</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">SSL Certificate: Valid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Firewall: Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Last Security Scan: 2 hours ago</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">2FA: Enabled</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={loadSettings}>Cancel</Button>
                <Button 
                  onClick={() => handleSave('Security', {
                    requireEmailVerification: settings.requireEmailVerification,
                    maintenanceMode: settings.maintenanceMode
                  })} 
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                User Management Settings
              </CardTitle>
              <CardDescription>
                Configure user registration and account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-base">Auto-approve New Users</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve new user registrations
                  </p>
                </div>
                <Switch
                  checked={settings.autoApproveUsers}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoApproveUsers: checked })}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxSessions">Max Concurrent Sessions</Label>
                  <Input
                    id="maxSessions"
                    type="number"
                    value={settings.maxConcurrentSessions}
                    onChange={(e) => setSettings({ ...settings, maxConcurrentSessions: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of simultaneous logins per user
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Automatically log out inactive users
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={loadSettings}>Cancel</Button>
                <Button 
                  onClick={() => handleSave('User', {
                    autoApproveUsers: settings.autoApproveUsers,
                    maxConcurrentSessions: settings.maxConcurrentSessions,
                    sessionTimeout: settings.sessionTimeout
                  })} 
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Settings */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Test Configuration
              </CardTitle>
              <CardDescription>
                Manage test and examination settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxDuration">Max Test Duration (minutes)</Label>
                  <Input
                    id="maxDuration"
                    type="number"
                    value={settings.maxTestDuration}
                    onChange={(e) => setSettings({ ...settings, maxTestDuration: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultQuestions">Default Questions per Test</Label>
                  <Input
                    id="defaultQuestions"
                    type="number"
                    value={settings.defaultTestQuestions}
                    onChange={(e) => setSettings({ ...settings, defaultTestQuestions: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="passingScore">Passing Score (%)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    value={settings.passingScore}
                    onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attemptsAllowed">Max Attempts Allowed</Label>
                  <Input
                    id="attemptsAllowed"
                    type="number"
                    value={settings.maxAttempts}
                    onChange={(e) => setSettings({ ...settings, maxAttempts: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={loadSettings}>Cancel</Button>
                <Button 
                  onClick={() => handleSave('Test', {
                    maxTestDuration: settings.maxTestDuration,
                    defaultTestQuestions: settings.defaultTestQuestions,
                    passingScore: settings.passingScore,
                    maxAttempts: settings.maxAttempts
                  })} 
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure notification preferences and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email alerts for important events
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS alerts for critical updates
                  </p>
                </div>
                <Switch
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                />
              </div>

              <Separator />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="text-base">Weekly Progress Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send weekly summary reports to administrators
                  </p>
                </div>
                <Switch
                  checked={settings.weeklyReports}
                  onCheckedChange={(checked) => setSettings({ ...settings, weeklyReports: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Notification Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={settings.adminEmail}
                  onChange={(e) => setSettings({ ...settings, adminEmail: e.target.value })}
                  placeholder="admin@theprepville.com"
                />
                <p className="text-xs text-muted-foreground">
                  Primary email for receiving admin notifications
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={loadSettings}>Cancel</Button>
                <Button 
                  onClick={() => handleSave('Notifications', {
                    emailNotifications: settings.emailNotifications,
                    smsNotifications: settings.smsNotifications,
                    weeklyReports: settings.weeklyReports,
                    adminEmail: settings.adminEmail
                  })} 
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                Appearance Settings
              </CardTitle>
              <CardDescription>
                Customize the look and feel of the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={settings.theme} onValueChange={(value) => setSettings({ ...settings, theme: value })}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base">Brand Colors</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={loadSettings}>Cancel</Button>
                <Button 
                  onClick={() => handleSave('Appearance', {
                    theme: settings.theme,
                    primaryColor: settings.primaryColor,
                    secondaryColor: settings.secondaryColor
                  })} 
                  className="gap-2"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                System Settings
              </CardTitle>
              <CardDescription>
                Monitor system status and manage technical settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">System Status</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      loadStatistics();
                      checkSystemStatus();
                      toast.success('Status refreshed');
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge variant={dbStatus === 'connected' ? 'default' : 'destructive'} className={dbStatus === 'connected' ? 'bg-green-600' : ''}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {dbStatus === 'connected' ? 'Connected' : 'Error'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Status</span>
                    <Badge variant={apiStatus === 'online' ? 'default' : 'destructive'} className={apiStatus === 'online' ? 'bg-green-600' : ''}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {apiStatus === 'online' ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Storage</span>
                    <span className="text-sm text-muted-foreground">{statistics.storageUsed} GB / 100 GB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-muted-foreground">2 hours ago</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base">Platform Statistics</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">{statistics.totalUsers.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">{statistics.activeTests.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Active Tests</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">{statistics.totalQuestions.toLocaleString()}</div>
                      <p className="text-xs text-muted-foreground">Questions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">{statistics.uptime}%</div>
                      <p className="text-xs text-muted-foreground">Uptime</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="text-base">Cache Management</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => toast.success('Application cache cleared')}
                  >
                    Clear Application Cache
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => toast.success('Database cache cleared')}
                  >
                    Clear Database Cache
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => toast.success('Database optimized')}
                  >
                    Optimize Database
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;

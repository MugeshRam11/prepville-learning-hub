
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Shield, Globe, Bell, Database } from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    siteName: 'The Prep Ville',
    siteDescription: 'Comprehensive EdTech platform for MYP and IBDP students',
    allowRegistration: true,
    requireEmailVerification: true,
    enableNotifications: true,
    maintenanceMode: false,
    maxTestDuration: 120,
    defaultTestQuestions: 10
  });

  const handleSave = async (section) => {
    // Here you would save settings to your backend
    toast.success(`${section} settings saved successfully`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600">Configure system settings and preferences</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>General Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Site Name</label>
                  <Input
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Default Test Duration (minutes)</label>
                  <Input
                    type="number"
                    value={settings.maxTestDuration}
                    onChange={(e) => setSettings({ ...settings, maxTestDuration: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Site Description</label>
                <Textarea
                  value={settings.siteDescription}
                  onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Allow User Registration</label>
                  <p className="text-sm text-gray-500">Enable new users to create accounts</p>
                </div>
                <Switch
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
                />
              </div>
              <Button onClick={() => handleSave('General')}>
                <Save className="w-4 h-4 mr-2" />
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Require Email Verification</label>
                  <p className="text-sm text-gray-500">Users must verify their email before accessing the platform</p>
                </div>
                <Switch
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Maintenance Mode</label>
                  <p className="text-sm text-gray-500">Temporarily disable access for maintenance</p>
                </div>
                <Switch
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                />
              </div>
              <Button onClick={() => handleSave('Security')}>
                <Save className="w-4 h-4 mr-2" />
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>Notification Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium">Enable System Notifications</label>
                  <p className="text-sm text-gray-500">Send notifications for system events</p>
                </div>
                <Switch
                  checked={settings.enableNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
                />
              </div>
              <Button onClick={() => handleSave('Notifications')}>
                <Save className="w-4 h-4 mr-2" />
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="w-5 h-5" />
                <span>System Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Default Questions per Test</label>
                <Input
                  type="number"
                  value={settings.defaultTestQuestions}
                  onChange={(e) => setSettings({ ...settings, defaultTestQuestions: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Database Status:</span>
                    <span className="ml-2 text-green-600">Connected</span>
                  </div>
                  <div>
                    <span className="font-medium">Last Backup:</span>
                    <span className="ml-2">2 hours ago</span>
                  </div>
                  <div>
                    <span className="font-medium">Total Users:</span>
                    <span className="ml-2">1,234</span>
                  </div>
                  <div>
                    <span className="font-medium">Total Tests:</span>
                    <span className="ml-2">56</span>
                  </div>
                </div>
              </div>
              <Button onClick={() => handleSave('System')}>
                <Save className="w-4 h-4 mr-2" />
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;

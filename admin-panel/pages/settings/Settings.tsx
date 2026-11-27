import apiClient from '../../api/client';
import { useState, useEffect } from 'react';
import { Save, Shield, Globe, Database, Key, Users, Plus, Trash2, MessageSquare } from 'lucide-react';
import ChatModerationSettings from './ChatModerationSettings';
import { useAuth } from '../../context/AuthContext';
import {
  changePassword,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  type AdminUser,
} from '../../api/endpoints/auth';

type Tab = 'general' | 'chat' | 'password' | 'admins' | 'backup';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="text-gray-500 mt-1">إعدادات النظام العامة</p>
      </div>

      {/* التبويبات */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
        <TabButton
          active={activeTab === 'general'}
          onClick={() => setActiveTab('general')}
          icon={Globe}
          label="عام"
        />
        <TabButton
          active={activeTab === 'chat'}
          onClick={() => setActiveTab('chat')}
          icon={MessageSquare}
          label="الدردشة والرقابة 💬"
        />
        <TabButton
          active={activeTab === 'password'}
          onClick={() => setActiveTab('password')}
          icon={Key}
          label="كلمة المرور"
        />
        <TabButton
          active={activeTab === 'admins'}
          onClick={() => setActiveTab('admins')}
          icon={Users}
          label="المدراء"
        />
        <TabButton
          active={activeTab === 'backup'}
          onClick={() => setActiveTab('backup')}
          icon={Database}
          label="النسخ الاحتياطي"
        />
      </div>

      {/* المحتوى */}
      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'chat' && <ChatModerationSettings />}
      {activeTab === 'password' && <PasswordSettings />}
      {activeTab === 'admins' && <AdminsSettings currentUserId={user?.id} />}
      {activeTab === 'backup' && <BackupSettings />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition ${
        active
          ? 'bg-primary-600 text-white'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );
}

// ==================== الإعدادات العامة ====================
function GeneralSettings() {
  const [chatRetentionDays, setChatRetentionDays] = useState<number>(0);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionSuccess, setRetentionSuccess] = useState('');

  // 👑 إعداد المقاعد الذهبية
  const [goldenSeats, setGoldenSeats] = useState<number>(3);
  const [goldenSaving, setGoldenSaving] = useState(false);
  const [goldenSuccess, setGoldenSuccess] = useState('');

  useEffect(() => {
    // جلب مدة حفظ المحادثات من السيرفر
    import('../../api/client').then(({ default: api }) => {
      api.get('/chat/retention')
        .then(res => {
          if (res.data?.success) {
            setChatRetentionDays(res.data.retention_days || 0);
          }
        })
        .catch(() => {});
    });

    // جلب عدد المقاعد الذهبية
    import('../../api/endpoints/appointments').then(({ getGoldenSeatsCount }) => {
      getGoldenSeatsCount()
        .then(count => setGoldenSeats(count))
        .catch(() => {});
    });
  }, []);

  const handleSaveRetention = async () => {
    setRetentionSaving(true);
    setRetentionSuccess('');
    try {
      const { default: api } = await import('../../api/client');
      const res = await api.put('/chat/retention', { retention_days: chatRetentionDays });
      if (res.data?.success) {
        setRetentionSuccess(res.data.message || 'تم تحديث مدة حفظ المحادثات بنجاح');
      }
    } catch (e: any) {
      alert(e.response?.data?.message || 'تعذر تحديث مدة الحفظ');
    } finally {
      setRetentionSaving(false);
    }
  };

  const handleSaveGoldenSeats = async () => {
    setGoldenSaving(true);
    setGoldenSuccess('');
    try {
      const { updateGoldenSeatsCount } = await import('../../api/endpoints/appointments');
      await updateGoldenSeatsCount(goldenSeats);
      setGoldenSuccess('تم تحديث عدد المقاعد الذهبية بنجاح');
    } catch (e: any) {
      alert(e.response?.data?.message || 'تعذر تحديث عدد المقاعد الذهبية');
    } finally {
      setGoldenSaving(false);
    }
  };

  const [settings, setSettings] = useState({
    site_name: 'منصة الحجز الطبي',
    commission_rate: '10',
    currency: 'YER',
    notifications: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('admin_settings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    localStorage.setItem('admin_settings', JSON.stringify(settings));
    alert('تم حفظ الإعدادات');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم المنصة
          </label>
          <input
            type="text"
            value={settings.site_name}
            onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            نسبة العمولة (%)
          </label>
          <input
            type="number"
            value={settings.commission_rate}
            onChange={(e) => setSettings({ ...settings, commission_rate: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.notifications}
          onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
          className="w-5 h-5"
        />
        <span className="text-gray-700">تفعيل الإشعارات الفورية</span>
      </label>


      {/* 💬 إعداد مدة حفظ المحادثات */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <span className="text-lg">💬</span> مدة حفظ سجل محادثات الدردشة
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              حدد مدة بقاء الرسائل في التطبيق قبل أرشفتها/حذفها التلقائي، أو اختر "للأبد" لحفظ دائم بدون حد زمني.
            </p>
          </div>
          <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
            {chatRetentionDays === 0 ? 'محفوظة للأبد' : `${chatRetentionDays} يوماً`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              مدة بقاء الرسائل:
            </label>
            <select
              value={chatRetentionDays}
              onChange={(e) => setChatRetentionDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value={0}>♾️ حفظ دائم للأبد (بدون حذف)</option>
              <option value={7}>7 أيام (أسبوع)</option>
              <option value={15}>15 يوماً (أسبوعان)</option>
              <option value={30}>30 يوماً (شهر واحد)</option>
              <option value={90}>90 يوماً (3 أشهر)</option>
              <option value={180}>180 يوماً (6 أشهر)</option>
              <option value={365}>365 يوماً (سنة كاملة)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveRetention}
              disabled={retentionSaving}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {retentionSaving ? 'جاري الحفظ...' : 'تطبيق وحفظ مدة المحادثات'}
            </button>
            {retentionSuccess && (
              <span className="text-xs text-emerald-600 font-medium animate-fade-in">
                ✓ {retentionSuccess}
              </span>
            )}
          </div>
        </div>
      </div>


      {/* 👑 إعداد المقاعد الذهبية (الحجز المميز) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-amber-900 flex items-center gap-2">
              <span className="text-lg">👑</span> إعداد المقاعد الذهبية (الحجز المميز)
            </h4>
            <p className="text-xs text-amber-700 mt-1">
              عدد المقاعد الذهبية (المميزة لكل 3 ساعات) المتاحة للمرضى عند الحجز الطبي السريع في قائمة المواعيد اليومية لتقليل فترات الانتظار.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-bold">
            {goldenSeats} مقاعد ذهبية
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-amber-800 mb-1.5">
              عدد المقاعد الذهبية المخصصة للمرضى يومياً (0 إلى 15):
            </label>
            <input
              type="number"
              min={0}
              max={15}
              value={goldenSeats}
              onChange={(e) => setGoldenSeats(Math.max(0, Math.min(15, parseInt(e.target.value) || 0)))}
              className="w-full px-3 py-2.5 bg-white border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 font-bold"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveGoldenSeats}
              disabled={goldenSaving}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              {goldenSaving ? 'جاري الحفظ...' : 'حفظ عدد المقاعد الذهبية'}
            </button>
            {goldenSuccess && (
              <span className="text-xs text-amber-800 font-medium animate-fade-in">
                ✓ {goldenSuccess}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition"
        >
          <Save className="w-5 h-5" />
          حفظ الإعدادات
        </button>
      </div>
    </div>
  );
}

// ==================== كلمة المرور ====================
function PasswordSettings() {
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.new_password !== form.confirm_password) {
      setError('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }

    if (form.new_password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess('تم تغيير كلمة المرور بنجاح');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في تغيير كلمة المرور');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-purple-100 p-2 rounded-lg">
          <Key className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="font-semibold text-gray-900">تغيير كلمة المرور</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            كلمة المرور الحالية
          </label>
          <input
            type="password"
            required
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            كلمة المرور الجديدة
          </label>
          <input
            type="password"
            required
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            تأكيد كلمة المرور
          </label>
          <input
            type="password"
            required
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {isSubmitting ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
        </button>
      </form>
    </div>
  );
}

// ==================== المدراء ====================
function AdminsSettings({ currentUserId }: { currentUserId?: number }) {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'admin',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createAdmin(form);
      setForm({ username: '', password: '', full_name: '', role: 'admin' });
      setShowForm(false);
      loadAdmins();
      alert('تم إضافة المدير');
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطأ في الإضافة');
    }
  };

  const handleDelete = async (id: number) => {
    if (id === currentUserId) {
      alert('لا يمكنك حذف حسابك');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا المدير؟')) return;
    try {
      await deleteAdmin(id);
      loadAdmins();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في الحذف');
    }
  };

  const handleToggle = async (id: number, isActive: boolean) => {
    if (id === currentUserId) {
      alert('لا يمكنك تعطيل حسابك');
      return;
    }
    try {
      await updateAdmin(id, { is_active: !isActive });
      loadAdmins();
    } catch (err: any) {
      alert(err.response?.data?.message || 'خطأ في التعديل');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="font-semibold text-gray-900">المدراء</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          إضافة مدير
        </button>
      </div>

      {/* نموذج الإضافة */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-50 rounded-xl p-4 mb-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الاسم الكامل *
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المستخدم *
              </label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الدور
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="admin">مدير</option>
                <option value="supervisor">مشرف</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition"
            >
              <Save className="w-4 h-4" />
              حفظ
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* القائمة */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-semibold">
                    {admin.full_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {admin.full_name}
                    {admin.id === currentUserId && (
                      <span className="text-xs text-primary-600 mr-2">(أنت)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    @{admin.username} ·{' '}
                    {admin.role === 'admin' ? 'مدير' : 'مشرف'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    admin.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {admin.is_active ? 'نشط' : 'معطّل'}
                </span>
                <button
                  onClick={() => handleToggle(admin.id, !!admin.is_active)}
                  className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                  title="تفعيل/تعطيل"
                >
                  <Shield className="w-4 h-4" />
                </button>
                {admin.id !== currentUserId && (
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== النسخ الاحتياطي ====================
function BackupSettings() {
  const [backups, setBackups] = useState<any[]>([]);
  const [frequency, setFrequency] = useState<string>('daily');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/admin/system/backups');
      if (res.data.success) {
        setBackups(res.data.backups || []);
        if (res.data.frequency) setFrequency(res.data.frequency);
      }
    } catch (e: any) {
      console.error('Failed to load backups:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setIsGenerating(true);
    setMsg(null);
    try {
      const res = await apiClient.post('/admin/system/backup');
      if (res.data.success) {
        setMsg({ text: 'تم إنشاء النسخة الاحتياطية بنجاح 🛡️', type: 'success' });
        loadBackups();
      }
    } catch (e: any) {
      setMsg({ text: e.response?.data?.message || 'فشل إنشاء النسخة الاحتياطية', type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadLiveBackup = () => {
    // تنزيل ملف .db الحالي عبر نافذة المتصفح
    const token = localStorage.getItem('token') || '';
    window.open(`${apiClient.defaults.baseURL}/admin/system/backup/download?token=${token}`, '_blank');
  };

  const handleFrequencyChange = async (newFreq: string) => {
    setFrequency(newFreq);
    try {
      await apiClient.put('/admin/system/backup/frequency', { frequency: newFreq });
      setMsg({ text: 'تم تحديث جدولة النسخ الاحتياطي بنجاح', type: 'success' });
    } catch (e: any) {
      setMsg({ text: 'فشل حفظ جدول التكرار', type: 'error' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl">
            <Database className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">النسخ الاحتياطي للنظام (SQLite WAL Snapshots)</h2>
            <p className="text-sm text-gray-500">حفظ وتنزيل نسخ كاملة وآمنة من قاعدة البيانات الطبية</p>
          </div>
        </div>

        <button
          onClick={handleDownloadLiveBackup}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          📥 تنزيل نسخة الآن (.db)
        </button>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-sm ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* خيارات الجدولة والتوليد اليدوي */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 block">تردد الجدولة التلقائية:</label>
          <select
            value={frequency}
            onChange={(e) => handleFrequencyChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="daily">نسخ يومي (Daily - كل 24 ساعة)</option>
            <option value="every_6_hours">كل 6 ساعات (موصى به للمنصات النشطة)</option>
            <option value="weekly">نسخ أسبوعي (Weekly - كل يوم جمعة)</option>
          </select>
          <span className="text-[11px] text-gray-500 block">يتم الاحتفاظ بآخر 30 نسخة احتياطية دورياً وتطهير الأقدم تلقائياً.</span>
        </div>

        <div className="flex flex-col justify-end">
          <button
            onClick={handleManualBackup}
            disabled={isGenerating}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {isGenerating ? 'جاري أخذ لقطة فورية...' : '⚡ إنشاء لقطة فورية على الخادم (Snapshot)'}
          </button>
        </div>
      </div>

      {/* قائمة النسخ الاحتياطية المتوفرة */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-3">النسخ الاحتياطية المحفوظة محلياً:</h3>
        {isLoading ? (
          <div className="text-center py-6 text-gray-500 text-sm">جاري جلب القائمة...</div>
        ) : backups.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg">لا توجد ملفات نسخ سابقة.</div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 text-sm">
            {backups.slice(0, 8).map((b, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-mono font-semibold text-gray-800 block text-xs">{b.filename}</span>
                    <span className="text-[11px] text-gray-400">{new Date(b.created_at).toLocaleString('ar-YE')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">{b.size_formatted}</span>
                  <a
                    href={`${apiClient.defaults.baseURL}/admin/system/backup/download?filename=${b.filename}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold border border-emerald-200"
                  >
                    تنزيل .db
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { X, CheckCircle, XCircle, AlertTriangle, User, Phone, Mail, Calendar, FileText } from 'lucide-react';
import type { RecoveryRequest } from '../../api/endpoints/recovery';

interface Props {
  request: RecoveryRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

export default function RecoveryDetailsModal({ request, onClose, onApprove, onReject }: Props) {
  const submitted = request.submitted || ({} as any);
  const registered = request.registered;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">📊 مراجعة بيانات الطلب</h2>
            <p className="text-sm text-gray-500 mt-1">رقم الطلب: #{request.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* نتيجة المطابقة */}
          <div className={`p-4 rounded-xl border-2 ${
            request.match_confirmed
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {request.match_confirmed ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-700">تم التحقق من البيانات</p>
                    <p className="text-sm text-green-600">البيانات المُدخلة تطابق حسابًا مسجلاً في النظام</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-700">لم يتم العثور على تطابق</p>
                    <p className="text-sm text-red-600">لا يوجد حساب بهذا الرقم في النظام — راجع البيانات بعناية</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* البيانات المُدخلة */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              البيانات المُدخلة في الطلب
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">الاسم الكامل:</span>
                <span className="font-semibold text-gray-900">{submitted.full_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">رقم الهاتف:</span>
                <span className="font-mono font-semibold text-gray-900">{submitted.phone || '—'}</span>
              </div>
              {submitted.match_ratio !== undefined && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-gray-700">نسبة تطابق الاسم:</span>
                  <span className="font-semibold text-gray-900">
                    {Math.round((submitted.match_ratio || 0) * 100)}%
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">تاريخ الطلب:</span>
                <span className="text-gray-900">
                  {new Date(request.created_at).toLocaleString('ar-EG')}
                </span>
              </div>
            </div>
          </div>

          {/* البيانات المسجلة */}
          {registered ? (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                البيانات المسجّلة في النظام
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">الاسم المسجّل:</span>
                  <span className="font-semibold text-gray-900">{registered.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">رقم الهاتف المسجّل:</span>
                  <span className="font-mono font-semibold text-gray-900">{registered.phone}</span>
                </div>
                {registered.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700">البريد الإلكتروني:</span>
                    <span className="text-gray-900">{registered.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">نوع الحساب:</span>
                  <span className="font-semibold text-gray-900">
                    {registered.user_type === 'doctor' ? '👨‍⚕️ طبيب' :
                     registered.user_type === 'secretary' ? '👩‍💼 سكرتيرة' :
                     '🧑‍🦱 مريض'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-600" />
                  <span className="text-gray-700">حالة الحساب:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    registered.status === 'approved' ? 'bg-green-100 text-green-700' :
                    registered.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {registered.status === 'approved' ? 'معتمد' :
                     registered.status === 'pending' ? 'قيد المراجعة' :
                     registered.status === 'rejected' ? 'مرفوض' : registered.status}
                  </span>
                </div>
                {registered.is_blocked === 1 && (
                  <div className="p-2 bg-red-100 rounded-lg text-red-700 text-xs">
                    ⚠️ هذا الحساب محظور
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <h3 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                لم يتم العثور على حساب مسجّل
              </h3>
              <p className="text-sm text-red-700">
                رقم الهاتف المُدخل <span className="font-mono font-semibold">{submitted.phone}</span> غير موجود في قاعدة البيانات.
                <br />
                <strong>لا يجب الموافقة على هذا الطلب</strong> — فقد يكون محاولة وصول غير مصرح بها.
              </p>
            </div>
          )}

          {/* ملاحظات المراجعة السابقة */}
          {request.notes && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h3 className="font-semibold text-amber-900 mb-1">📝 ملاحظات المراجعة:</h3>
              <p className="text-sm text-amber-800">{request.notes}</p>
            </div>
          )}
        </div>

        {/* Footer — الإجراءات */}
        {request.status === 'pending' && (
          <div className="p-5 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
            <button
              onClick={onApprove}
              disabled={!request.match_confirmed}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition ${
                request.match_confirmed
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              موافقة على الطلب
            </button>
            <button
              onClick={onReject}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition"
            >
              <XCircle className="w-5 h-5" />
              رفض الطلب
            </button>
          </div>
        )}

        {request.status !== 'pending' && (
          <div className="p-5 border-t border-gray-200 flex justify-end sticky bottom-0 bg-white rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition"
            >
              إغلاق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
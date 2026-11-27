import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, XCircle, Image as ImageIcon, Award } from 'lucide-react';
import { getPayments, confirmPayment, rejectPayment, type Payment } from '../../api/endpoints/payments';

export default function ConfirmPayment() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadPayment(Number(id));
  }, [id]);

  const loadPayment = async (paymentId: number) => {
    try {
      const payments = await getPayments();
      const found = payments.find((p) => p.id === paymentId);
      if (found) setPayment(found);
      else {
        alert('الدفعة غير موجودة');
        navigate('/payments');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (status: 'confirmed' | 'rejected') => {
    if (!id) return;
    try {
      if (status === 'confirmed') await confirmPayment(Number(id));
      else await rejectPayment(Number(id));
      alert(status === 'confirmed' ? 'تم تأكيد الدفع وترقية الحجز للمقعد الذهبي 👑' : 'تم رفض الدفع');
      navigate('/payments');
    } catch (error) {
      alert('خطأ في تنفيذ العملية');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>;
  }

  if (!payment) return null;

  const txId = payment.transaction_id || payment.appointment_transaction_id;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/payments')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراجعة الدفع والحوالة</h1>
          <p className="text-gray-500 mt-1">رقم الحجز: {payment.booking_code}</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-900 text-sm">
        <Award className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <span className="font-bold">ملاحظة الحجز الذهبي: </span>
          عند تأكيد هذا الدفع، سيتم ترقية الحجز لأحد المقاعد الأولية ذات الأولوية (الحجز الذهبي 👑) إذا كان متاحاً وإشعار المريض فوراً.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">المريض</p>
            <p className="font-semibold text-gray-900">{payment.patient_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">المبلغ</p>
            <p className="font-semibold text-gray-900">
              {payment.amount.toLocaleString('ar-YE')} ر.ي
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">طريقة الدفع</p>
            <p className="font-semibold text-gray-900">{payment.method}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">التاريخ</p>
            <p className="font-semibold text-gray-900">{payment.created_at}</p>
          </div>
          {txId && (
            <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-medium">رقم الحوالة المدخل من المريض:</p>
              <p className="font-mono font-bold text-lg text-blue-950 mt-0.5">{txId}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500 mb-2">صورة الإشعار</p>
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
            <p>لا توجد صورة مرفقة (تم الاعتماد على رقم الحوالة الإلكتروني)</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleAction('rejected')}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition"
          >
            <XCircle className="w-5 h-5" />
            رفض الدفع
          </button>
          <button
            onClick={() => handleAction('confirmed')}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg transition font-medium"
          >
            <Award className="w-5 h-5" />
            تأكيد الدفع وترقية المقعد الذهبي 👑
          </button>
        </div>
      </div>
    </div>
  );
}
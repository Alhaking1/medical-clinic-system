import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import DoctorsList from './pages/doctors/DoctorsList';
import PendingDoctors from './pages/doctors/PendingDoctors';
import AddDoctor from './pages/doctors/AddDoctor';
import EditDoctor from './pages/doctors/EditDoctor';
import DoctorDetails from './pages/doctors/DoctorDetails';
import DoctorPermissionsEditor from './pages/doctors/DoctorPermissionsEditor';
import GlobalDoctorPermissions from './pages/doctors/GlobalDoctorPermissions';
import ClinicsList from './pages/clinics/ClinicsList';
import PendingClinics from './pages/clinics/PendingClinics';
import ClinicDetails from './pages/clinics/ClinicDetails';
import EditClinic from './pages/clinics/EditClinic';
import SlotsList from './pages/slots/SlotsList';
import PeriodsList from './pages/periods/PeriodsList';   // 🆕
import SecretariesList from './pages/secretaries/SecretariesList';
import PendingSecretaries from './pages/secretaries/PendingSecretaries';
import AddSecretary from './pages/secretaries/AddSecretary';
import EditSecretary from './pages/secretaries/EditSecretary';
import PermissionsEditor from './pages/secretaries/PermissionsEditor';
import GlobalSecretaryPermissions from './pages/secretaries/GlobalSecretaryPermissions';
import PatientsList from './pages/patients/PatientsList';
import PatientDetails from './pages/patients/PatientDetails';
import AppointmentsList from './pages/appointments/AppointmentsList';
import MedicalRecords from './pages/records/MedicalRecords';
import PaymentsList from './pages/payments/PaymentsList';
import ConfirmPayment from './pages/payments/ConfirmPayment';
import Reports from './pages/reports/Reports';
import ClearData from './pages/reports/ClearData';
import Settings from './pages/settings/Settings';
import RequestsList from './pages/registrations/RequestsList';
import RecoveryRequests from './pages/recovery/RecoveryRequests';
import OffersList from './pages/offers/OffersList';
import AddOffer from './pages/offers/AddOffer';
import EditOffer from './pages/offers/EditOffer';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        {/* طلبات التسجيل */}
        <Route path="/requests" element={<RequestsList />} />
        <Route path="/recovery" element={<RecoveryRequests />} />

        {/* الأطباء */}
        <Route path="/doctors" element={<DoctorsList />} />
        <Route path="/doctors/pending" element={<PendingDoctors />} />
        <Route path="/doctors/add" element={<AddDoctor />} />
        <Route path="/doctors/:id/edit" element={<EditDoctor />} />
        <Route path="/doctors/:id" element={<DoctorDetails />} />
        <Route path="/doctors/:id/permissions" element={<DoctorPermissionsEditor />} />
        <Route path="/doctors/permissions/all" element={<GlobalDoctorPermissions />} />

        {/* العيادات */}
        <Route path="/clinics" element={<ClinicsList />} />
        <Route path="/clinics/pending" element={<PendingClinics />} />
        <Route path="/clinics/:id/edit" element={<EditClinic />} />
        <Route path="/clinics/:id" element={<ClinicDetails />} />

        {/* المواعيد (قديم) + الفترات (جديد) */}
        <Route path="/slots" element={<SlotsList />} />
        <Route path="/periods" element={<PeriodsList />} />   {/* 🆕 */}

        {/* السكرتيرات */}
        <Route path="/secretaries" element={<SecretariesList />} />
        <Route path="/secretaries/pending" element={<PendingSecretaries />} />
        <Route path="/secretaries/add" element={<AddSecretary />} />
        <Route path="/secretaries/:id/edit" element={<EditSecretary />} />
        <Route path="/secretaries/:id/permissions" element={<PermissionsEditor />} />
        <Route path="/secretaries/permissions/all" element={<GlobalSecretaryPermissions />} />

        {/* المرضى */}
        <Route path="/patients" element={<PatientsList />} />
        <Route path="/patients/:id" element={<PatientDetails />} />

        {/* الحجوزات */}
        <Route path="/appointments" element={<AppointmentsList />} />
        <Route path="/medical-records" element={<MedicalRecords />} />

        {/* العروض */}
        <Route path="/offers" element={<OffersList />} />
        <Route path="/offers/add" element={<AddOffer />} />
        <Route path="/offers/:id/edit" element={<EditOffer />} />

        {/* المدفوعات */}
        <Route path="/payments" element={<PaymentsList />} />
        <Route path="/payments/:id/confirm" element={<ConfirmPayment />} />

        {/* التقارير ومحو البيانات */}
        <Route path="/reports" element={<Reports />} />
        <Route path="/clear-data" element={<ClearData />} />

        {/* الإعدادات */}
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
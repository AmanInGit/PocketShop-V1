/**
 * Settings Page - Vendor configuration
 *
 * Manages business info, profile, operations, notifications, and payment settings.
 * Data is stored in vendor_profiles and metadata (JSONB).
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useVendor } from '@/features/vendor/hooks/useVendor';
import { updateVendorProfile } from '@/features/vendor/services/vendorService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  User,
  Bell,
  Clock,
  CreditCard,
  Loader2,
  Save,
  ImageIcon,
  Tag,
  Plus,
  Trash2,
  LayoutGrid,
} from 'lucide-react';
import { TableConfigStrip } from '@/features/vendor/components/TableConfigStrip';
import { TableQRCard } from '@/features/vendor/components/TableQRCard';
import { useVendorTables } from '@/features/vendor/hooks/useVendorTables';
import { ConfirmActionDialog } from '@/components/common/ConfirmActionDialog';
import QRCode from 'qrcode';
import { formatOfferText } from '@/features/storefront/utils/offerUtils';
import { SUPPORTED_SERVICE_CITIES } from '@/features/common/constants/serviceCities';

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'food', label: 'Food' },
  { value: 'retail', label: 'Retail' },
  { value: 'salon', label: 'Salon' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'other', label: 'Other' },
];

const BUSINESS_ENTITY_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private_limited', label: 'Private Limited' },
  { value: 'llp', label: 'LLP' },
  { value: 'other', label: 'Other' },
] as const;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MAX_VENDOR_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const DEFAULT_NOTIFICATION_PREFS = {
  email_notifications: true,
  order_notifications: true,
  low_stock_alerts: true,
  payout_notifications: true,
} satisfies Record<string, boolean>;

type NotificationPrefs = {
  email_notifications?: boolean;
  order_notifications?: boolean;
  low_stock_alerts?: boolean;
  payout_notifications?: boolean;
};

type BankAccount = {
  account_number?: string;
  ifsc?: string;
  account_type?: 'savings' | 'current';
};

type KycTaxState = {
  pan_number?: string;
  gst_registered?: boolean;
  gstin?: string;
  business_entity_type?: 'sole_proprietorship' | 'partnership' | 'private_limited' | 'llp' | 'other';
  cancelled_cheque_url?: string;
};

type PaymentModesState = {
  accept_cash_at_counter?: boolean;
  accept_online_qr_app?: boolean;
  pay_at_table_via_waiter?: boolean;
  allow_bill_request?: boolean;
  allow_call_waiter?: boolean;
};

type KotSettingsState = {
  auto_print_kot?: boolean;
  printer_target?: string;
};

type BusinessFormState = {
  business_name: string;
  business_type: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type ProfileFormState = {
  owner_name: string;
  email: string;
  mobile_number: string;
  logo_url: string;
  banner_url: string;
  banner_color: string;
};

const SETTINGS_SECTIONS = [
  { value: 'business', label: 'Business', icon: Building2 },
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'staff', label: 'Staff', icon: User },
  { value: 'layout', label: 'Layout', icon: LayoutGrid },
  { value: 'offers', label: 'Offers', icon: Tag },
  { value: 'operations', label: 'Operations', icon: Clock },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'payment', label: 'Payment', icon: CreditCard },
] as const;

const BANNER_COLOR_PRESETS = [
  { value: '#f97316', label: 'Orange' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#eab308', label: 'Amber' },
  { value: '#ef4444', label: 'Red' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#64748b', label: 'Slate' },
];

type OperationalHoursState = { open: string; close: string };

type FssaiState = {
  license_number: string;
  expiry_date: string; // YYYY-MM-DD
  document_url: string;
  status: 'unverified' | 'verifying' | 'verified';
};

type Offer = {
  id: string;
  type: 'percentage' | 'flat';
  value: number;
  max_discount?: number;
  min_order: number;
  promo_code: string;
};

type StaffMember = {
  id: string;
  name: string;
  phone: string;
  role: 'manager' | 'staff';
};

export default function Settings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: vendor, isLoading: vendorLoading } = useVendor();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    tables,
    tableConfig,
    vendorId,
    isLoading: tablesLoading,
    saveTableConfig,
    isSaving,
    saveLayout,
    isSavingLayout,
  } = useVendorTables();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = ['business', 'profile', 'staff', 'layout', 'offers', 'operations', 'notifications', 'payment'].includes(tabParam || '')
    ? tabParam!
    : 'business';
  const setActiveTab = (tab: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const [businessForm, setBusinessForm] = useState<BusinessFormState>({
    business_name: '',
    business_type: '',
    description: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'IN',
  });
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    owner_name: '',
    email: '',
    mobile_number: '',
    logo_url: '',
    banner_url: '',
    banner_color: '#f97316',
  });
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [operationalHours, setOperationalHours] = useState<OperationalHoursState>({ open: '09:00', close: '22:00' });
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>({ ...DEFAULT_NOTIFICATION_PREFS });
  const [paymentForm, setPaymentForm] = useState<BankAccount>({ account_number: '', ifsc: '' });
  const [kycTaxForm, setKycTaxForm] = useState<KycTaxState>({
    pan_number: '',
    gst_registered: false,
    gstin: '',
    business_entity_type: 'sole_proprietorship',
    cancelled_cheque_url: '',
  });
  const [paymentModes, setPaymentModes] = useState<PaymentModesState>({
    accept_cash_at_counter: true,
    accept_online_qr_app: true,
    pay_at_table_via_waiter: false,
    allow_bill_request: true,
    allow_call_waiter: false,
  });
  const [kotSettings, setKotSettings] = useState<KotSettingsState>({
    auto_print_kot: false,
    printer_target: '',
  });
  const [confirmAccount, setConfirmAccount] = useState('');
  const [showBankForm, setShowBankForm] = useState(true);
  const [fssaiForm, setFssaiForm] = useState<FssaiState>({
    license_number: '',
    expiry_date: '',
    document_url: '',
    status: 'unverified',
  });
  const [restaurantImages, setRestaurantImages] = useState<string[]>([]);
  const [foodImages, setFoodImages] = useState<string[]>([]);
  const [isUploadingRestaurant, setIsUploadingRestaurant] = useState(false);
  const [isUploadingFood, setIsUploadingFood] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [appearOnDashboard, setAppearOnDashboard] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [metadataDraft, setMetadataDraft] = useState<Record<string, unknown>>({});
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmSaveTitle, setConfirmSaveTitle] = useState('Save changes?');
  const [confirmSaveDescription, setConfirmSaveDescription] = useState('Do you want to save these changes?');
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => void) | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [pendingDiscardAction, setPendingDiscardAction] = useState<(() => void) | null>(null);

  const [baseline, setBaseline] = useState<{
    businessForm: BusinessFormState;
    profileForm: ProfileFormState;
    workingDays: string[];
    operationalHours: OperationalHoursState;
    notificationPrefs: NotificationPrefs;
    paymentForm: BankAccount;
    kycTaxForm: KycTaxState;
    paymentModes: PaymentModesState;
    kotSettings: KotSettingsState;
    fssaiForm: FssaiState;
    restaurantImages: string[];
    foodImages: string[];
    offers: Offer[];
    appearOnDashboard: boolean;
    staffMembers: StaffMember[];
  } | null>(null);

  useEffect(() => {
    if (vendor) {
      const meta = vendor.metadata as Record<string, unknown> | null;
      const normalizedMeta = meta ?? {};
      const nextBusinessForm = {
        business_name: vendor.business_name ?? '',
        business_type: vendor.business_type ?? '',
        description: vendor.description ?? '',
        address: vendor.address ?? '',
        city: vendor.city ?? '',
        state: vendor.state ?? '',
        postal_code: vendor.postal_code ?? '',
        country: vendor.country ?? 'IN',
      };
      const nextProfileForm = {
        owner_name: vendor.owner_name ?? '',
        email: vendor.email ?? '',
        mobile_number: vendor.mobile_number ?? '',
        logo_url: vendor.logo_url ?? '',
        banner_url: vendor.banner_url ?? '',
        banner_color: (meta?.banner_color as string) || '#f97316',
      };
      const nextWorkingDays = ((vendor.working_days as string[]) ?? []).slice();
      const hours = vendor.operational_hours as Record<string, { open?: string; close?: string }> | null;
      const first = hours ? Object.values(hours).find((h) => h?.open || h?.close) : undefined;
      const nextOperationalHours = {
        open: first?.open ?? '09:00',
        close: first?.close ?? '22:00',
      };
      const nextNotificationPrefs: NotificationPrefs = {
        ...DEFAULT_NOTIFICATION_PREFS,
        ...((meta?.notification_preferences as NotificationPrefs) ?? {}),
      };
      const nextPaymentForm: BankAccount = {
        account_number: '',
        ifsc: '',
        account_type: 'savings',
        ...((meta?.bank_account as BankAccount) ?? {}),
      };
      const nextKycTaxForm: KycTaxState = {
        pan_number: '',
        gst_registered: false,
        gstin: '',
        business_entity_type: 'sole_proprietorship',
        cancelled_cheque_url: '',
        ...((meta?.kyc_tax as KycTaxState) ?? {}),
      };
      const nextPaymentModes: PaymentModesState = {
        accept_cash_at_counter: true,
        accept_online_qr_app: true,
        pay_at_table_via_waiter: false,
        allow_bill_request: true,
        allow_call_waiter: false,
        ...((meta?.payment_modes as PaymentModesState) ?? {}),
      };
      const nextKotSettings: KotSettingsState = {
        auto_print_kot: false,
        printer_target: '',
        ...((meta?.kot_settings as KotSettingsState) ?? {}),
      };
      const nextFssaiForm: FssaiState = {
        license_number: '',
        expiry_date: '',
        document_url: '',
        status: 'unverified',
        ...((meta?.fssai as Partial<FssaiState>) ?? {}),
      };
      const nextRestaurantImages = ((meta?.restaurant_images as string[]) ?? []).slice();
      const nextFoodImages = ((meta?.food_images as string[]) ?? []).slice();
      const rawOffers = (meta?.offers as Offer[]) ?? [];
      const nextOffers: Offer[] = Array.isArray(rawOffers)
        ? rawOffers
            .filter((o) => o && typeof o === 'object' && ('type' in o || 'value' in o))
            .map((o) => ({
              id: (o as Offer)?.id ?? crypto.randomUUID(),
              type: (o as Offer).type === 'flat' ? 'flat' : 'percentage',
              value: Number((o as Offer).value) || 0,
              max_discount: (o as Offer).max_discount != null ? Number((o as Offer).max_discount) : undefined,
              min_order: Number((o as Offer).min_order) || 0,
              promo_code: String((o as Offer).promo_code ?? '').trim() || '',
            }))
        : [];
      const rawStaffMembers = (meta?.staff_accounts as StaffMember[]) ?? [];
      const nextStaffMembers: StaffMember[] = Array.isArray(rawStaffMembers)
        ? rawStaffMembers
            .filter((s) => s && typeof s === 'object')
            .map((s) => ({
              id: (s as StaffMember).id ?? crypto.randomUUID(),
              name: String((s as StaffMember).name ?? '').trim(),
              phone: String((s as StaffMember).phone ?? '').trim(),
              role: ((s as StaffMember).role === 'manager' ? 'manager' : 'staff') as StaffMember['role'],
            }))
        : [];

      const nextAppearOnDashboard = !!meta?.appear_on_dashboard;

      setBusinessForm(nextBusinessForm);
      setProfileForm(nextProfileForm);
      setWorkingDays(nextWorkingDays);
      setOperationalHours(nextOperationalHours);
      setNotificationPrefs(nextNotificationPrefs);
      setPaymentForm(nextPaymentForm);
      setKycTaxForm(nextKycTaxForm);
      setPaymentModes(nextPaymentModes);
      setKotSettings(nextKotSettings);
      setConfirmAccount('');
      setFssaiForm(nextFssaiForm);
      setShowBankForm(!nextPaymentForm.account_number); // if already saved, show summary by default
      setRestaurantImages(nextRestaurantImages);
      setFoodImages(nextFoodImages);
      setOffers(nextOffers);
      setAppearOnDashboard(nextAppearOnDashboard);
      setStaffMembers(nextStaffMembers);
      setMetadataDraft(normalizedMeta);

      setBaseline({
        businessForm: nextBusinessForm,
        profileForm: nextProfileForm,
        workingDays: nextWorkingDays,
        operationalHours: nextOperationalHours,
        notificationPrefs: nextNotificationPrefs,
        paymentForm: nextPaymentForm,
        kycTaxForm: nextKycTaxForm,
        paymentModes: nextPaymentModes,
        kotSettings: nextKotSettings,
        fssaiForm: nextFssaiForm,
        restaurantImages: nextRestaurantImages,
        foodImages: nextFoodImages,
        offers: nextOffers,
        appearOnDashboard: nextAppearOnDashboard,
        staffMembers: nextStaffMembers,
      });
    }
  }, [vendor]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await updateVendorProfile(user.id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data?.metadata && typeof data.metadata === 'object') {
        setMetadataDraft(data.metadata as Record<string, unknown>);
      }
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      toast({ title: 'Settings saved', description: 'Your changes have been saved.' });
    },
    onError: (err: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });

  const mutateVendorWithMetadata = (
    metadataPatch: Record<string, unknown>,
    additionalUpdates: Record<string, unknown> = {},
    afterSuccess?: () => void,
  ) => {
    const nextMetadata = {
      ...metadataDraft,
      ...metadataPatch,
    };
    updateMutation.mutate(
      {
        ...additionalUpdates,
        metadata: nextMetadata,
      },
      {
        onSuccess: () => {
          setMetadataDraft(nextMetadata);
          afterSuccess?.();
        },
      },
    );
  };

  const toggleWorkingDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const normalizeDays = (days: string[]) => days.slice().sort((a, b) => a.localeCompare(b));
  const sameDays = (a: string[], b: string[]) => normalizeDays(a).join('|') === normalizeDays(b).join('|');
  const sameString = (a?: string, b?: string) => (a ?? '') === (b ?? '');
  const sameNotif = (a: NotificationPrefs, b: NotificationPrefs) => {
    const keys = Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[];
    return keys.every((k) => !!a[k] === !!b[k]);
  };

  const businessDirty = !!baseline && (
    !sameString(businessForm.business_name, baseline.businessForm.business_name) ||
    !sameString(businessForm.business_type, baseline.businessForm.business_type) ||
    !sameString(businessForm.description, baseline.businessForm.description) ||
    !sameString(businessForm.address, baseline.businessForm.address) ||
    !sameString(businessForm.city, baseline.businessForm.city) ||
    !sameString(businessForm.state, baseline.businessForm.state) ||
    !sameString(businessForm.postal_code, baseline.businessForm.postal_code) ||
    !sameString(businessForm.country, baseline.businessForm.country) ||
    appearOnDashboard !== baseline.appearOnDashboard
  );

  const profileDirty = !!baseline && (
    !sameString(profileForm.owner_name, baseline.profileForm.owner_name) ||
    !sameString(profileForm.email, baseline.profileForm.email) ||
    !sameString(profileForm.mobile_number, baseline.profileForm.mobile_number) ||
    !sameString(profileForm.logo_url, baseline.profileForm.logo_url) ||
    !sameString(profileForm.banner_url, baseline.profileForm.banner_url) ||
    !sameString(profileForm.banner_color, baseline.profileForm.banner_color)
  );

  const operationsDirty = !!baseline && (
    !sameDays(workingDays, baseline.workingDays) ||
    !sameString(operationalHours.open, baseline.operationalHours.open) ||
    !sameString(operationalHours.close, baseline.operationalHours.close)
  );

  const notificationsDirty = !!baseline && !sameNotif(notificationPrefs, baseline.notificationPrefs);

  const paymentDirty = !!baseline && (
    !sameString(paymentForm.account_number, baseline.paymentForm.account_number) ||
    !sameString(paymentForm.ifsc, baseline.paymentForm.ifsc) ||
    (paymentForm.account_type ?? 'savings') !== (baseline.paymentForm.account_type ?? 'savings')
  );

  const kycTaxDirty = !!baseline && (
    !sameString(kycTaxForm.pan_number, baseline.kycTaxForm.pan_number) ||
    !!kycTaxForm.gst_registered !== !!baseline.kycTaxForm.gst_registered ||
    !sameString(kycTaxForm.gstin, baseline.kycTaxForm.gstin) ||
    !sameString(kycTaxForm.cancelled_cheque_url, baseline.kycTaxForm.cancelled_cheque_url) ||
    (kycTaxForm.business_entity_type ?? 'sole_proprietorship') !==
      (baseline.kycTaxForm.business_entity_type ?? 'sole_proprietorship')
  );

  const paymentModesDirty = !!baseline && (
    !!paymentModes.accept_cash_at_counter !== !!baseline.paymentModes.accept_cash_at_counter ||
    !!paymentModes.accept_online_qr_app !== !!baseline.paymentModes.accept_online_qr_app ||
    !!paymentModes.pay_at_table_via_waiter !== !!baseline.paymentModes.pay_at_table_via_waiter ||
    !!paymentModes.allow_bill_request !== !!baseline.paymentModes.allow_bill_request ||
    !!paymentModes.allow_call_waiter !== !!baseline.paymentModes.allow_call_waiter
  );

  const kotSettingsDirty = !!baseline && (
    !!kotSettings.auto_print_kot !== !!baseline.kotSettings.auto_print_kot ||
    !sameString(kotSettings.printer_target, baseline.kotSettings.printer_target)
  );

  const sameOffers = (a: Offer[], b: Offer[]) => {
    if (a.length !== b.length) return false;
    return a.every((oa, i) => {
      const ob = b[i];
      return (
        oa.id === ob?.id &&
        oa.type === ob?.type &&
        oa.value === ob?.value &&
        oa.max_discount === ob?.max_discount &&
        oa.min_order === ob?.min_order &&
        oa.promo_code === ob?.promo_code
      );
    });
  };
  const offersDirty = !!baseline && !sameOffers(offers, baseline.offers);

  const sameStaffMembers = (a: StaffMember[], b: StaffMember[]) => {
    if (a.length !== b.length) return false;
    return a.every((sa, i) => {
      const sb = b[i];
      return (
        sa.id === sb?.id &&
        sa.name === sb?.name &&
        sa.phone === sb?.phone &&
        sa.role === sb?.role
      );
    });
  };
  const staffDirty = !!baseline && !sameStaffMembers(staffMembers, baseline.staffMembers);

  const sameFssai = (a: FssaiState, b: FssaiState) =>
    sameString(a.license_number, b.license_number) &&
    sameString(a.expiry_date, b.expiry_date) &&
    sameString(a.document_url, b.document_url) &&
    a.status === b.status;

  const fssaiDirty = !!baseline && !sameFssai(fssaiForm, baseline.fssaiForm);
  const hasUnsavedChanges =
    businessDirty ||
    profileDirty ||
    operationsDirty ||
    notificationsDirty ||
    paymentDirty ||
    kycTaxDirty ||
    paymentModesDirty ||
    kotSettingsDirty ||
    offersDirty ||
    staffDirty ||
    fssaiDirty;

  const requestDiscardConfirmation = (action: () => void) => {
    setPendingDiscardAction(() => action);
    setConfirmDiscardOpen(true);
  };

  const handleSectionChange = (nextTab: string) => {
    if (nextTab === activeTab) return;
    if (hasUnsavedChanges) {
      requestDiscardConfirmation(() => setActiveTab(nextTab));
      return;
    }
    setActiveTab(nextTab);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleDocumentNavigation = (event: MouseEvent) => {
      if (!hasUnsavedChanges || updateMutation.isPending) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;

      const hrefAttr = anchor.getAttribute('href');
      if (!hrefAttr || hrefAttr.startsWith('#') || hrefAttr.startsWith('mailto:') || hrefAttr.startsWith('tel:')) return;

      const nextUrl = new URL(anchor.href, window.location.origin);
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (nextUrl.origin !== window.location.origin || nextPath === currentPath) return;

      event.preventDefault();
      requestDiscardConfirmation(() => navigate(nextPath));
    };

    document.addEventListener('click', handleDocumentNavigation, true);
    return () => document.removeEventListener('click', handleDocumentNavigation, true);
  }, [hasUnsavedChanges, navigate, updateMutation.isPending]);

  const uploadVendorImage = async (file: File, folder: 'restaurant' | 'food') => {
    if (!vendor?.id) throw new Error('No vendor ID');
    if (!file.type.startsWith('image/')) {
      throw new Error(`${file.name} is not a supported image file.`);
    }
    if (file.size > MAX_VENDOR_IMAGE_SIZE_BYTES) {
      throw new Error(`${file.name} exceeds 5MB. Please upload a smaller image.`);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${vendor.id}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleRestaurantImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploadingRestaurant(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadVendorImage(file, 'restaurant');
        uploaded.push(url);
      }
      const next = [...restaurantImages, ...uploaded];
      setRestaurantImages(next);

      mutateVendorWithMetadata(
        {
          restaurant_images: next,
          food_images: foodImages,
        },
        {},
        () => {
          setBaseline((prev) => (prev ? { ...prev, restaurantImages: next } : prev));
        },
      );
    } catch (err: any) {
      console.error('Error uploading restaurant images', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to upload restaurant images',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingRestaurant(false);
      e.target.value = '';
    }
  };

  const handleFoodImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setIsUploadingFood(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const url = await uploadVendorImage(file, 'food');
        uploaded.push(url);
      }
      const next = [...foodImages, ...uploaded];
      setFoodImages(next);

      mutateVendorWithMetadata(
        {
          restaurant_images: restaurantImages,
          food_images: next,
        },
        {},
        () => {
          setBaseline((prev) => (prev ? { ...prev, foodImages: next } : prev));
        },
      );
    } catch (err: any) {
      console.error('Error uploading food images', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to upload food images',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingFood(false);
      e.target.value = '';
    }
  };

  const removeRestaurantImage = (urlToRemove: string) => {
    const next = restaurantImages.filter((url) => url !== urlToRemove);
    setRestaurantImages(next);
    mutateVendorWithMetadata(
      { restaurant_images: next, food_images: foodImages },
      {},
      () => setBaseline((prev) => (prev ? { ...prev, restaurantImages: next } : prev)),
    );
  };

  const removeFoodImage = (urlToRemove: string) => {
    const next = foodImages.filter((url) => url !== urlToRemove);
    setFoodImages(next);
    mutateVendorWithMetadata(
      { restaurant_images: restaurantImages, food_images: next },
      {},
      () => setBaseline((prev) => (prev ? { ...prev, foodImages: next } : prev)),
    );
  };

  const requestSaveConfirmation = (title: string, description: string, action: () => void) => {
    setConfirmSaveTitle(title);
    setConfirmSaveDescription(description);
    setPendingSaveAction(() => action);
    setConfirmSaveOpen(true);
  };

  const saveBusiness = () => {
    mutateVendorWithMetadata(
      {
        appear_on_dashboard: appearOnDashboard,
      },
      {
        business_name: businessForm.business_name,
        business_type: businessForm.business_type || null,
        description: businessForm.description || null,
        address: businessForm.address || null,
        city: businessForm.city || null,
        state: businessForm.state || null,
        postal_code: businessForm.postal_code || null,
        country: businessForm.country,
      },
      () =>
        setBaseline((prev) =>
          prev
            ? { ...prev, businessForm: { ...businessForm }, appearOnDashboard }
            : prev
        ),
    );
  };

  const saveProfile = () => {
    mutateVendorWithMetadata(
      { banner_color: profileForm.banner_color },
      {
        owner_name: profileForm.owner_name || null,
        email: profileForm.email,
        mobile_number: profileForm.mobile_number,
        logo_url: profileForm.logo_url || null,
        banner_url: profileForm.banner_url || null,
      },
      () => setBaseline((prev) => (prev ? { ...prev, profileForm: { ...profileForm } } : prev)),
    );
  };

  const saveOperationalHours = () => {
    const hours: Record<string, { open: string; close: string }> = {};
    workingDays.forEach((d) => {
      hours[d.toLowerCase()] = operationalHours;
    });
    updateMutation.mutate({
      working_days: workingDays,
      operational_hours: Object.keys(hours).length ? hours : null,
    });
    setBaseline((prev) =>
      prev
        ? { ...prev, workingDays: workingDays.slice(), operationalHours: { ...operationalHours } }
        : prev,
    );
  };

  const toggleNotification = (key: keyof NotificationPrefs, value: boolean) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const saveNotifications = () => {
    mutateVendorWithMetadata(
      { notification_preferences: notificationPrefs },
      {},
      () => setBaseline((prev) => (prev ? { ...prev, notificationPrefs: { ...notificationPrefs } } : prev)),
    );
  };

  const savePayment = () => {
    const normalizedGstin = (kycTaxForm.gstin ?? '').trim().toUpperCase();
    const shouldRequireGstin = !!kycTaxForm.gst_registered;
    if (shouldRequireGstin && normalizedGstin.length !== 15) {
      toast({
        variant: 'destructive',
        title: 'Invalid GSTIN',
        description: 'GSTIN must be 15 characters when GST registered is enabled.',
      });
      return;
    }
    mutateVendorWithMetadata(
      {
        bank_account: {
          account_number: paymentForm.account_number || undefined,
          ifsc: paymentForm.ifsc || undefined,
          account_type: paymentForm.account_type || undefined,
        },
        kyc_tax: {
          pan_number: (kycTaxForm.pan_number || '').trim().toUpperCase() || undefined,
          gst_registered: !!kycTaxForm.gst_registered,
          gstin: shouldRequireGstin ? normalizedGstin : undefined,
          business_entity_type: kycTaxForm.business_entity_type || 'sole_proprietorship',
          cancelled_cheque_url: (kycTaxForm.cancelled_cheque_url || '').trim() || undefined,
        },
        payment_modes: {
          accept_cash_at_counter: !!paymentModes.accept_cash_at_counter,
          accept_online_qr_app: !!paymentModes.accept_online_qr_app,
          pay_at_table_via_waiter: !!paymentModes.pay_at_table_via_waiter,
          allow_bill_request: !!paymentModes.allow_bill_request,
          allow_call_waiter: !!paymentModes.allow_call_waiter,
        },
        kot_settings: {
          auto_print_kot: !!kotSettings.auto_print_kot,
          printer_target: (kotSettings.printer_target || '').trim() || undefined,
        },
      },
      {},
      () =>
        setBaseline((prev) =>
          prev
            ? {
                ...prev,
                paymentForm: { ...paymentForm },
                kycTaxForm: {
                  ...kycTaxForm,
                  gstin: shouldRequireGstin ? normalizedGstin : '',
                },
                paymentModes: { ...paymentModes },
                kotSettings: { ...kotSettings },
              }
            : prev
        ),
    );
    setConfirmAccount('');
    setShowBankForm(false);
  };

  const saveOffers = () => {
    mutateVendorWithMetadata(
      {
        offers: offers.filter((o) => o.value > 0 && o.min_order >= 0 && (o.promo_code || '').trim()),
      },
      {},
      () => setBaseline((prev) => (prev ? { ...prev, offers: [...offers] } : prev)),
    );
  };

  const addOffer = () => {
    setOffers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: 'percentage' as const, value: 20, max_discount: 50, min_order: 100, promo_code: '' },
    ]);
  };

  const removeOffer = (id: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOffer = (id: string, field: keyof Offer, value: string | number) => {
    setOffers((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        if (field === 'type') return { ...o, type: value as 'percentage' | 'flat' };
        if (field === 'value') return { ...o, value: Number(value) || 0 };
        if (field === 'min_order') return { ...o, min_order: Number(value) || 0 };
        if (field === 'max_discount') {
          const v = value === '' || value == null ? undefined : Number(value);
          return { ...o, max_discount: v };
        }
        if (field === 'promo_code') return { ...o, promo_code: String(value ?? '').trim().toUpperCase() };
        return o;
      })
    );
  };

  const addStaffMember = () => {
    setStaffMembers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', phone: '', role: 'staff' },
    ]);
  };

  const removeStaffMember = (id: string) => {
    setStaffMembers((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStaffMember = (id: string, patch: Partial<StaffMember>) => {
    setStaffMembers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
  };

  const saveStaffMembers = () => {
    const sanitized: StaffMember[] = staffMembers
      .map((s) => ({
        id: s.id,
        name: (s.name || '').trim(),
        phone: (s.phone || '').trim(),
        role: (s.role === 'manager' ? 'manager' : 'staff') as StaffMember['role'],
      }))
      .filter((s) => s.name && s.phone);

    mutateVendorWithMetadata(
      { staff_accounts: sanitized },
      {},
      () => setBaseline((prev) => (prev ? { ...prev, staffMembers: [...sanitized] } : prev)),
    );
  };

  const handleDownloadTableQR = async (tableSlug: string, tableCode: string) => {
    const url = `${window.location.origin}/storefront/${vendorId}?table=${tableSlug}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `table-${tableCode}.png`;
      a.click();
    } catch (e) {
      console.error('Failed to generate QR', e);
    }
  };

  const handleDownloadAllTableQRs = async () => {
    if (!vendorId) return;
    for (const t of tables) {
      await handleDownloadTableQR(t.table_slug, t.table_code);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  const saveFssai = () => {
    mutateVendorWithMetadata(
      {
        fssai: {
          license_number: fssaiForm.license_number || undefined,
          expiry_date: fssaiForm.expiry_date || undefined,
          document_url: fssaiForm.document_url || undefined,
          status: fssaiForm.status || 'unverified',
        },
      },
      {},
      () => setBaseline((prev) => (prev ? { ...prev, fssaiForm: { ...fssaiForm } } : prev)),
    );
  };

  if (vendorLoading || !vendor) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const textLabel = 'text-sm font-medium text-foreground';
  const textHint = 'text-sm text-slate-400 dark:text-slate-400';
  const RequiredStar = () => <span className="text-destructive">*</span>;
  const isFoodBusiness = ['restaurant', 'food', 'cafe'].includes((businessForm.business_type || '').toLowerCase());
  const savedAccountLast4 = (baseline?.paymentForm.account_number || '').slice(-4);
  const hasSavedBank = !!baseline?.paymentForm.account_number && !!baseline?.paymentForm.ifsc;
  const hasPaymentSetupChanges = paymentDirty || kycTaxDirty || paymentModesDirty || kotSettingsDirty;
  const bankFieldsValid =
    !!paymentForm.account_number &&
    !!paymentForm.ifsc &&
    !!confirmAccount &&
    paymentForm.account_number === confirmAccount;
  const canSavePaymentSetup = !updateMutation.isPending && hasPaymentSetupChanges && (!paymentDirty || bankFieldsValid);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings</h2>
          <p className={textHint}>
            Manage your account, business, and preferences
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SETTINGS_SECTIONS.map((section) => {
            const isActive = activeTab === section.value;
            return (
              <button
                key={section.value}
                type="button"
                onClick={() => handleSectionChange(section.value)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-foreground bg-foreground text-background shadow-sm'
                    : 'border-border bg-background text-foreground hover:bg-muted'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={handleSectionChange} className="w-full">
        <div>
        <TabsContent value="business" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Business Information</CardTitle>
              <CardDescription className={textHint}>
                Your store details shown to customers on your storefront
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className={textLabel}>Business name <RequiredStar /></Label>
                <Input
                  value={businessForm.business_name}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, business_name: e.target.value }))}
                  placeholder="e.g. My Restaurant"
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className={textLabel}>Business type <RequiredStar /></Label>
                <Select
                  value={businessForm.business_type}
                  onValueChange={(v) => setBusinessForm((p) => ({ ...p, business_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={textLabel}>Description</Label>
                <Textarea
                  value={businessForm.description}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of your business"
                  rows={3}
                  className="text-foreground"
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">Appear on Dashboard</p>
                    <p className={textHint}>Allow your best offer to be considered for the customer dashboard section.</p>
                  </div>
                  <Switch
                    checked={appearOnDashboard}
                    onCheckedChange={(checked) => {
                      // TODO: Trigger vendor dashboard appearance approval request workflow when backend API is ready.
                      setAppearOnDashboard(checked);
                    }}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className={textLabel}>Address <RequiredStar /></Label>
                <Input
                  value={businessForm.address}
                  onChange={(e) => setBusinessForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Street address"
                  className="text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={textLabel}>City <RequiredStar /></Label>
                  <Select
                    value={businessForm.city}
                    onValueChange={(value) => setBusinessForm((p) => ({ ...p, city: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_SERVICE_CITIES.map((city) => (
                        <SelectItem key={city.value} value={city.value}>
                          {city.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={textLabel}>State</Label>
                  <Input
                    value={businessForm.state}
                    onChange={(e) => setBusinessForm((p) => ({ ...p, state: e.target.value }))}
                    placeholder="State"
                    className="text-foreground"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={textLabel}>Postal code</Label>
                  <Input
                    value={businessForm.postal_code}
                    onChange={(e) => setBusinessForm((p) => ({ ...p, postal_code: e.target.value }))}
                    placeholder="Postal code"
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={textLabel}>Country</Label>
                  <Input
                    value={businessForm.country}
                    onChange={(e) => setBusinessForm((p) => ({ ...p, country: e.target.value }))}
                    placeholder="Country code (e.g. IN)"
                    className="text-foreground"
                  />
                </div>
              </div>

              {isFoodBusiness && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <p className="text-base font-semibold text-foreground">Menu & operational photos</p>
                      <p className={textHint}>
                        Add images that will appear on your restaurant page. Keep it clean and simple for customers.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Restaurant images</p>
                      <p className="text-xs text-muted-foreground">
                        Add entrance and interior photos. JPEG/PNG up to 5MB each.
                      </p>
                      <div className="space-y-3">
                        <label className="flex flex-col items-center justify-center w-full min-h-[140px] rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                          <span className="text-sm font-medium text-primary mb-1">Add restaurant images</span>
                          <span className="text-xs text-muted-foreground">Click to upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleRestaurantImagesChange}
                          />
                        </label>
                        {isUploadingRestaurant && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading images...
                          </p>
                        )}
                        {restaurantImages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {restaurantImages.map((url) => (
                              <div key={url} className="relative">
                                <img
                                  src={url}
                                  alt="Restaurant"
                                  className="h-16 w-24 rounded-md object-cover border border-border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeRestaurantImage(url)}
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 shadow-sm"
                                  aria-label="Remove image"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium text-foreground">Food images (optional)</p>
                      <p className="text-xs text-muted-foreground">
                        Showcase some of your best dishes. JPEG/PNG up to 5MB each.
                      </p>
                      <div className="space-y-3">
                        <label className="flex flex-col items-center justify-center w-full min-h-[120px] rounded-lg border-2 border-dashed border-border bg-muted/40 cursor-pointer hover:bg-muted transition-colors">
                          <span className="text-sm font-medium text-foreground mb-1">Add food images</span>
                          <span className="text-xs text-muted-foreground">Click to upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFoodImagesChange}
                          />
                        </label>
                        {isUploadingFood && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading images...
                          </p>
                        )}
                        {foodImages.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {foodImages.map((url) => (
                              <div key={url} className="relative">
                                <img
                                  src={url}
                                  alt="Food"
                                  className="h-16 w-24 rounded-md object-cover border border-border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeFoodImage(url)}
                                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 shadow-sm"
                                  aria-label="Remove image"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={() =>
                  requestSaveConfirmation(
                    'Save business info?',
                    'Do you want to save your business information changes?',
                    saveBusiness
                  )
                }
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save business info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Profile Settings</CardTitle>
              <CardDescription className={textHint}>
                Owner and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className={textLabel}>Owner name <RequiredStar /></Label>
                <Input
                  value={profileForm.owner_name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, owner_name: e.target.value }))}
                  placeholder="Your full name"
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className={textLabel}>Email <RequiredStar /></Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="business@example.com"
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className={textLabel}>Mobile number <RequiredStar /></Label>
                <Input
                  value={profileForm.mobile_number}
                  onChange={(e) => setProfileForm((p) => ({ ...p, mobile_number: e.target.value }))}
                  placeholder="+91 9876543210"
                  className="text-foreground"
                />
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">Storefront header</h4>
                </div>
                <p className={textHint}>
                  Wide image spanning the top of your storefront, or a solid color.
                </p>
                <div className="space-y-2">
                  <Label className={textLabel}>Header image (optional)</Label>
                  <Input
                    value={profileForm.banner_url}
                    onChange={(e) => setProfileForm((p) => ({ ...p, banner_url: e.target.value }))}
                    placeholder="https://... (optional — wide banner image)"
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={textLabel}>Header color</Label>
                  <div className="flex flex-wrap gap-3">
                    {BANNER_COLOR_PRESETS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setProfileForm((p) => ({ ...p, banner_color: value }))}
                        className={`flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all hover:opacity-90 ${
                          profileForm.banner_color === value
                            ? 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                            : ''
                        }`}
                        title={label}
                      >
                        <span
                          className="h-10 w-10 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: value }}
                        />
                        <span className="text-xs font-medium text-foreground">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className={textLabel}>Logo (optional)</Label>
                <p className={textHint}>
                  Small circular icon shown next to your business name (e.g. brand mark). Separate from the header image.
                </p>
                <Input
                  value={profileForm.logo_url}
                  onChange={(e) => setProfileForm((p) => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://... (optional)"
                  className="text-foreground"
                />
              </div>

              <Button
                onClick={() =>
                  requestSaveConfirmation(
                    'Save profile?',
                    'Do you want to save your profile changes?',
                    saveProfile
                  )
                }
                disabled={updateMutation.isPending || !profileDirty}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Staff Accounts</CardTitle>
              <CardDescription className={textHint}>
                Add team members for dine-in operations with simple role assignment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staffMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff members added yet.</p>
              ) : (
                staffMembers.map((member) => (
                  <div key={member.id} className="rounded-lg border border-border bg-card p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className={textLabel}>Name</Label>
                        <Input
                          value={member.name}
                          onChange={(e) => updateStaffMember(member.id, { name: e.target.value })}
                          placeholder="Staff name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className={textLabel}>Phone</Label>
                        <Input
                          value={member.phone}
                          onChange={(e) => updateStaffMember(member.id, { phone: e.target.value })}
                          placeholder="Phone number"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className={textLabel}>Role</Label>
                        <Select
                          value={member.role}
                          onValueChange={(v) => updateStaffMember(member.id, { role: v as StaffMember['role'] })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" className="text-destructive" onClick={() => removeStaffMember(member.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}

              <Button type="button" variant="outline" onClick={addStaffMember} className="gap-2">
                <Plus className="h-4 w-4" />
                Add staff member
              </Button>

              <Button
                onClick={() =>
                  requestSaveConfirmation(
                    'Save staff accounts?',
                    'Do you want to save staff and role changes?',
                    saveStaffMembers
                  )
                }
                disabled={updateMutation.isPending || !staffDirty}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save staff accounts
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layout" className="mt-6 space-y-6">
          {/* Update configuration at top */}
          {tablesLoading ? (
            <div className="h-20 animate-pulse rounded-xl border bg-muted/30" />
          ) : (
            <TableConfigStrip
              tableConfig={tableConfig}
              saveTableConfig={saveTableConfig}
              isSaving={isSaving}
              tablesCount={tables.length}
            />
          )}
          {/* Table QR codes & floor plan below */}
          {tablesLoading ? (
            <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />
          ) : (
            <TableQRCard
              tables={tables}
              tableConfig={tableConfig}
              vendorId={vendorId}
              onDownloadTable={handleDownloadTableQR}
              onDownloadAll={handleDownloadAllTableQRs}
              onSaveLayout={saveLayout}
              isSavingLayout={isSavingLayout}
            />
          )}
        </TabsContent>

        <TabsContent value="offers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Offers</CardTitle>
              <CardDescription className={textHint}>
                Discount offers shown on your storefront. Text and cards are auto-generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 rounded-lg border border-border bg-muted/20 space-y-4"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={offer.type}
                          onValueChange={(v) => updateOffer(offer.id, 'type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="flat">Flat amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {offer.type === 'percentage' ? 'Discount %' : 'Discount ₹'}
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={offer.type === 'percentage' ? 100 : 9999}
                          value={offer.value || ''}
                          onChange={(e) => updateOffer(offer.id, 'value', e.target.value)}
                          placeholder={offer.type === 'percentage' ? '20' : '50'}
                        />
                      </div>
                      {offer.type === 'percentage' && (
                        <div className="space-y-1">
                          <Label className="text-xs">Max discount ₹</Label>
                          <Input
                            type="number"
                            min={0}
                            value={offer.max_discount ?? ''}
                            onChange={(e) => updateOffer(offer.id, 'max_discount', e.target.value)}
                            placeholder="50"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-xs">Min order ₹</Label>
                        <Input
                          type="number"
                          min={0}
                          value={offer.min_order || ''}
                          onChange={(e) => updateOffer(offer.id, 'min_order', e.target.value)}
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">Promo code (required)</Label>
                        <Input
                          placeholder="e.g. SAVE20"
                          value={offer.promo_code || ''}
                          onChange={(e) => updateOffer(offer.id, 'promo_code', e.target.value)}
                          className="uppercase"
                        />
                        <p className="text-xs text-muted-foreground">
                          Customer must enter this code at checkout to apply the discount
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive shrink-0"
                      onClick={() => removeOffer(offer.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {offer.value > 0 && offer.min_order >= 0 && (
                    <div className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                      {formatOfferText(offer)}
                    </div>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addOffer} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add offer
              </Button>
              <Button
                onClick={() =>
                  requestSaveConfirmation(
                    'Save offers?',
                    'Do you want to save your offers changes?',
                    saveOffers
                  )
                }
                disabled={updateMutation.isPending || !offersDirty}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save offers
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Operations</CardTitle>
              <CardDescription className={textHint}>
                Working days and hours required to go online. Default 9:00–22:00 is typical for restaurants — adjust as needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className={textLabel}>Mark open days <RequiredStar /></Label>
                <p className={textHint}>Don&apos;t forget to uncheck your off-day.</p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {WEEKDAYS.map((day) => {
                    const isActive = workingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`min-w-[96px] rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-primary">
                  Have separate day wise timings?{' '}
                  <span className="underline underline-offset-2 pointer-events-none select-none">
                    Add day wise slots (coming soon)
                  </span>
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={textLabel}>Open time <RequiredStar /></Label>
                  <Input
                    type="time"
                    value={operationalHours.open}
                    onChange={(e) => setOperationalHours((p) => ({ ...p, open: e.target.value }))}
                    className="text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={textLabel}>Close time <RequiredStar /></Label>
                  <Input
                    type="time"
                    value={operationalHours.close}
                    onChange={(e) => setOperationalHours((p) => ({ ...p, close: e.target.value }))}
                    className="text-foreground"
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  requestSaveConfirmation(
                    'Save hours?',
                    'Do you want to save your operational hours changes?',
                    saveOperationalHours
                  )
                }
                disabled={updateMutation.isPending || !operationsDirty}
              >
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save hours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Notifications</CardTitle>
              <CardDescription className={textHint}>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: 'email_notifications' as const,
                  title: 'Email notifications',
                  desc: 'Receive updates via email',
                },
                {
                  key: 'order_notifications' as const,
                  title: 'Order notifications',
                  desc: 'Get notified when new orders arrive',
                },
                {
                  key: 'low_stock_alerts' as const,
                  title: 'Low stock alerts',
                  desc: 'Warn when inventory is low',
                },
                {
                  key: 'payout_notifications' as const,
                  title: 'Payout notifications',
                  desc: 'Notify when payouts are processed',
                },
              ].map(({ key, title, desc }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{title}</p>
                    <p className={textHint}>{desc}</p>
                  </div>
                  <Switch checked={!!notificationPrefs[key]} onCheckedChange={(v) => toggleNotification(key, v)} />
                </div>
              ))}
              <div className="pt-2">
                <Button
                  onClick={() =>
                    requestSaveConfirmation(
                      'Save notifications?',
                      'Do you want to save your notification preferences?',
                      saveNotifications
                    )
                  }
                  disabled={updateMutation.isPending || !notificationsDirty}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Payment & Payouts</CardTitle>
              <CardDescription className={textHint}>
                Bank account for receiving payouts (stored securely). Optional for going online — required only when you want to withdraw earnings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">Bank account details</p>
                  {hasSavedBank && !showBankForm && (
                    <Button type="button" variant="outline" onClick={() => setShowBankForm(true)}>
                      Change
                    </Button>
                  )}
                </div>
                <p className={textHint}>This is where PocketShop will deposit your earnings.</p>
              </div>

              {hasSavedBank && !showBankForm ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Account number</p>
                      <p className="mt-1 font-mono text-sm text-foreground">
                        •••• •••• •••• {savedAccountLast4 || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IFSC</p>
                      <p className="mt-1 font-mono text-sm text-foreground">
                        {(baseline?.paymentForm.ifsc || '').toUpperCase() || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Account type</p>
                      <p className="mt-1 text-sm text-foreground capitalize">
                        {baseline?.paymentForm.account_type || 'savings'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className={textLabel}>Bank account number</Label>
                    <Input
                      type="password"
                      value={paymentForm.account_number ?? ''}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, account_number: e.target.value }))}
                      placeholder="Enter bank account number"
                      className="text-foreground"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={textLabel}>Re-enter bank account number</Label>
                    <Input
                      value={confirmAccount}
                      onChange={(e) => setConfirmAccount(e.target.value)}
                      placeholder="Type account number again"
                      className="text-foreground"
                      autoComplete="off"
                    />
                    {confirmAccount && paymentForm.account_number !== confirmAccount && (
                      <p className="text-xs text-destructive">Account numbers do not match.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className={textLabel}>Enter IFSC code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={paymentForm.ifsc ?? ''}
                          onChange={(e) => setPaymentForm((p) => ({ ...p, ifsc: e.target.value.toUpperCase() }))}
                          placeholder="e.g. SBIN0001234"
                          className="text-foreground"
                        />
                        <Button type="button" variant="outline" disabled className="whitespace-nowrap">
                          Find IFSC
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Search by bank &amp; branch will be available soon.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className={textLabel}>Account type</Label>
                      <Select
                        value={paymentForm.account_type ?? 'savings'}
                        onValueChange={(v) => setPaymentForm((p) => ({ ...p, account_type: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="current">Current</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() =>
                        requestSaveConfirmation(
                          'Save bank details?',
                          'Do you want to save your bank details?',
                          savePayment
                        )
                      }
                      disabled={
                        updateMutation.isPending ||
                        !paymentDirty ||
                        !paymentForm.account_number ||
                        !paymentForm.ifsc ||
                        !confirmAccount ||
                        paymentForm.account_number !== confirmAccount
                      }
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save bank details
                    </Button>
                    {hasSavedBank && (
                      <Button type="button" variant="outline" onClick={() => { setShowBankForm(false); setConfirmAccount(''); }}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}

              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <p className="text-base font-semibold text-foreground">Legal, KYC & tax</p>
                  <p className={textHint}>
                    Basic compliance details used for payout and taxation setup.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={textLabel}>PAN number</Label>
                    <Input
                      value={kycTaxForm.pan_number ?? ''}
                      onChange={(e) =>
                        setKycTaxForm((p) => ({ ...p, pan_number: e.target.value.toUpperCase() }))
                      }
                      placeholder="e.g. ABCDE1234F"
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={textLabel}>Business entity type</Label>
                    <Select
                      value={kycTaxForm.business_entity_type ?? 'sole_proprietorship'}
                      onValueChange={(v) =>
                        setKycTaxForm((p) => ({ ...p, business_entity_type: v as KycTaxState['business_entity_type'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_ENTITY_TYPES.map((entity) => (
                          <SelectItem key={entity.value} value={entity.value}>
                            {entity.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <p className="font-medium text-foreground">GST registered?</p>
                    <p className={textHint}>Enable if your business has GST registration.</p>
                  </div>
                  <Switch
                    checked={!!kycTaxForm.gst_registered}
                    onCheckedChange={(checked) =>
                      setKycTaxForm((p) => ({
                        ...p,
                        gst_registered: checked,
                        gstin: checked ? p.gstin : '',
                      }))
                    }
                  />
                </div>
                {kycTaxForm.gst_registered && (
                  <div className="space-y-2">
                    <Label className={textLabel}>GSTIN</Label>
                    <Input
                      value={kycTaxForm.gstin ?? ''}
                      onChange={(e) => setKycTaxForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                      placeholder="15-digit GSTIN"
                      className="text-foreground"
                      maxLength={15}
                    />
                    <p className={textHint}>Required when GST registered is enabled.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className={textLabel}>Cancelled cheque URL (optional)</Label>
                  <Input
                    value={kycTaxForm.cancelled_cheque_url ?? ''}
                    onChange={(e) => setKycTaxForm((p) => ({ ...p, cancelled_cheque_url: e.target.value }))}
                    placeholder="https://... (upload integration can be added)"
                    className="text-foreground"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <p className="text-base font-semibold text-foreground">Payment collection modes</p>
                  <p className={textHint}>Choose how customers can pay in your dine-in flow.</p>
                </div>
                {[
                  {
                    key: 'accept_cash_at_counter' as const,
                    title: 'Accept cash at counter',
                    desc: 'Allow cash payments at billing counter',
                  },
                  {
                    key: 'accept_online_qr_app' as const,
                    title: 'Accept online via QR/App',
                    desc: 'Allow UPI/cards through app or QR',
                  },
                  {
                    key: 'pay_at_table_via_waiter' as const,
                    title: 'Pay at table via waiter',
                    desc: 'Allow waiter-assisted payment at table',
                  },
                  {
                    key: 'allow_bill_request' as const,
                    title: 'Allow bill request from table',
                    desc: 'Customers can request final bill from their phone',
                  },
                  {
                    key: 'allow_call_waiter' as const,
                    title: 'Allow call waiter from table',
                    desc: 'Customers can call staff digitally from their phone',
                  },
                ].map(({ key, title, desc }) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div>
                      <p className="font-medium text-foreground">{title}</p>
                      <p className={textHint}>{desc}</p>
                    </div>
                    <Switch
                      checked={!!paymentModes[key]}
                      onCheckedChange={(checked) => setPaymentModes((prev) => ({ ...prev, [key]: checked }))}
                    />
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                <div>
                  <p className="text-base font-semibold text-foreground">KOT settings</p>
                  <p className={textHint}>Basic kitchen order ticket preferences.</p>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <p className="font-medium text-foreground">Auto-print KOT</p>
                    <p className={textHint}>Automatically print a kitchen ticket when order arrives.</p>
                  </div>
                  <Switch
                    checked={!!kotSettings.auto_print_kot}
                    onCheckedChange={(checked) => setKotSettings((prev) => ({ ...prev, auto_print_kot: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={textLabel}>Printer target (optional)</Label>
                  <Input
                    value={kotSettings.printer_target ?? ''}
                    onChange={(e) => setKotSettings((prev) => ({ ...prev, printer_target: e.target.value }))}
                    placeholder="Thermal printer name / IP / bluetooth id"
                    className="text-foreground"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    requestSaveConfirmation(
                      'Save payment setup?',
                      'Do you want to save bank, KYC and payment mode changes?',
                      savePayment
                    )
                  }
                  disabled={!canSavePaymentSetup}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save payment setup
                </Button>
              </div>

              {isFoodBusiness && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-foreground">FSSAI details</p>
                        <p className={textHint}>
                          Required to comply with food safety regulations (restaurants / food businesses)
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Status: <span className="font-medium text-foreground">{fssaiForm.status}</span>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className={textLabel}>FSSAI number</Label>
                        <Input
                          value={fssaiForm.license_number}
                          onChange={(e) => setFssaiForm((p) => ({ ...p, license_number: e.target.value.trim() }))}
                          placeholder="Enter FSSAI license number"
                          className="text-foreground"
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={textLabel}>Expiry date</Label>
                        <Input
                          type="date"
                          value={fssaiForm.expiry_date}
                          onChange={(e) => setFssaiForm((p) => ({ ...p, expiry_date: e.target.value }))}
                          className="text-foreground"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <Label className={textLabel}>Certificate URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={fssaiForm.document_url}
                          onChange={(e) => setFssaiForm((p) => ({ ...p, document_url: e.target.value }))}
                          placeholder="https://... (upload will be added later)"
                          className="text-foreground"
                        />
                        <Button type="button" variant="outline" disabled className="whitespace-nowrap">
                          Upload
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Upload/verification will be available soon.</p>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        onClick={() =>
                          requestSaveConfirmation(
                            'Save FSSAI details?',
                            'Do you want to save your FSSAI details?',
                            saveFssai
                          )
                        }
                        disabled={updateMutation.isPending || !fssaiDirty}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save FSSAI details
                      </Button>
                      <Button type="button" variant="outline" disabled>
                        Verify (coming soon)
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
      <ConfirmActionDialog
        open={confirmSaveOpen}
        onOpenChange={(open) => {
          setConfirmSaveOpen(open);
          if (!open) setPendingSaveAction(null);
        }}
        onConfirm={() => {
          pendingSaveAction?.();
          setConfirmSaveOpen(false);
          setPendingSaveAction(null);
        }}
        title={confirmSaveTitle}
        description={confirmSaveDescription}
        confirmLabel="Yes, save"
        isConfirming={updateMutation.isPending}
      />
      <ConfirmActionDialog
        open={confirmDiscardOpen}
        onOpenChange={(open) => {
          setConfirmDiscardOpen(open);
          if (!open) setPendingDiscardAction(null);
        }}
        onConfirm={() => {
          pendingDiscardAction?.();
          setConfirmDiscardOpen(false);
          setPendingDiscardAction(null);
        }}
        title="Discard unsaved changes?"
        description="You have unsaved changes. Save first, or discard these edits to continue."
        confirmLabel="Discard and continue"
        isConfirming={false}
      />
    </div>
  );
}

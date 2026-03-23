/**
 * Public Routes Configuration
 * 
 * Routes that are accessible without authentication.
 */

import { lazy } from 'react';
import { ROUTES } from '@/constants/routes';
import type { RouteConfig } from './types';

// Eagerly loaded components (critical path)
import LandingPage from '@/app/pages/LandingPage';
import BusinessLandingPage from '@/app/pages/BusinessLandingPage';
import AboutUs from '@/app/pages/AboutUs';
import BlogPlaceholder from '@/app/pages/BlogPlaceholder';
import HelpCenterPage from '@/app/pages/HelpCenterPage';
import DocumentationPlaceholder from '@/app/pages/DocumentationPlaceholder';
import NotFound from '@/app/pages/NotFound';
import Offline from '@/app/pages/Offline';
import LoginPage from '@/features/auth/pages/LoginPage';
import AuthCallbackPage from '@/features/auth/pages/AuthCallbackPage';

// Lazy loaded components
const PublicStorefront = lazy(() => import('@/features/storefront/pages/PublicStorefront'));
const OrderConfirmation = lazy(() => import('@/app/pages/OrderConfirmation'));
const PaymentSuccess = lazy(() => import('@/app/pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/app/pages/PaymentCancel'));
const OrderTracking = lazy(() => import('@/app/pages/OrderTracking'));
const OrderFeedback = lazy(() => import('@/app/pages/OrderFeedback'));
const CustomerAuth = lazy(() => import('@/features/customer/pages/CustomerAuth'));
const CustomerHome = lazy(() => import('@/features/customer/pages/CustomerHome'));
const CustomerProfile = lazy(() => import('@/features/customer/pages/CustomerProfile'));
const PickupMonitor = lazy(() => import('@/app/pages/PickupMonitor'));
const ShopsPage = lazy(() => import('@/app/pages/ShopsPage'));

export const publicRoutes: RouteConfig[] = [
  {
    path: ROUTES.HOME,
    component: LandingPage,
    title: 'Home - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home' }],
  },
  {
    path: ROUTES.BUSINESS,
    component: BusinessLandingPage,
    title: 'For Business - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'For Business' }],
  },
  {
    path: ROUTES.ABOUT,
    component: AboutUs,
    title: 'About Us - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'About Us' }],
  },
  {
    path: ROUTES.BLOG,
    component: BlogPlaceholder,
    title: 'Blog - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Blog' }],
  },
  {
    path: ROUTES.HELP_CENTER,
    component: HelpCenterPage,
    title: 'Help Center - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Help Center' }],
  },
  {
    path: ROUTES.DOCUMENTATION,
    component: DocumentationPlaceholder,
    title: 'Documentation - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Documentation' }],
  },
  {
    path: ROUTES.LOGIN,
    component: LoginPage,
    title: 'Login - PocketShop',
    accessLevel: 'public',
    requiresAuth: false, // Explicitly public, but redirects if already authenticated
    eager: true,
    props: { mode: 'login' },
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Login' }],
  },
  {
    path: ROUTES.REGISTER,
    component: LoginPage,
    title: 'Register - PocketShop',
    accessLevel: 'public',
    requiresAuth: false, // Explicitly public, but redirects if already authenticated
    eager: true,
    props: { mode: 'register' },
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Register' }],
  },
  {
    path: ROUTES.AUTH_CALLBACK,
    component: AuthCallbackPage,
    title: 'Signing in - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Signing in' }],
  },
  {
    path: ROUTES.VENDOR_AUTH,
    redirect: ROUTES.LOGIN,
    title: 'Redirect to Login',
    accessLevel: 'public',
    replace: true,
  },
  {
    path: ROUTES.SHOPS,
    component: ShopsPage,
    title: 'Shops - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Shops' }],
  },
  {
    path: '/storefront/:vendorId',
    component: PublicStorefront,
    title: 'Storefront - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'full',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Storefront' }],
  },
  {
    path: ROUTES.ORDER_CONFIRMATION,
    component: OrderConfirmation,
    title: 'Order Confirmation - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'full',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Order Confirmation' }],
  },
  {
    path: ROUTES.PAYMENT_SUCCESS,
    component: PaymentSuccess,
    title: 'Payment successful - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Payment success' }],
  },
  {
    path: ROUTES.PAYMENT_CANCEL,
    component: PaymentCancel,
    title: 'Payment cancelled - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Payment cancelled' }],
  },
  {
    path: ROUTES.ORDER_TRACKING,
    component: OrderTracking,
    title: 'Order tracking - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Order tracking' }],
  },
  {
    path: ROUTES.ORDER_FEEDBACK,
    component: OrderFeedback,
    title: 'Order feedback - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Order feedback' }],
  },
  {
    path: ROUTES.CUSTOMER_AUTH,
    component: CustomerAuth,
    title: 'Customer sign in - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Customer sign in' }],
  },
  {
    path: ROUTES.CUSTOMER_HOME,
    component: CustomerHome,
    title: 'Customer home - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Customer home' }],
  },
  {
    path: ROUTES.CUSTOMER_PROFILE,
    component: CustomerProfile,
    title: 'Customer profile - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Customer profile' }],
  },
  {
    path: ROUTES.PICKUP_MONITOR,
    component: PickupMonitor,
    title: 'Pickup Monitor - PocketShop',
    accessLevel: 'public',
    loadingVariant: 'default',
    breadcrumbs: [{ label: 'Pickup Monitor' }],
  },
  {
    path: ROUTES.OFFLINE,
    component: Offline,
    title: 'Offline - PocketShop',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: 'Offline' }],
  },
  {
    path: ROUTES.NOT_FOUND,
    component: NotFound,
    title: '404 - Page Not Found',
    accessLevel: 'public',
    eager: true,
    breadcrumbs: [{ label: 'Home', path: ROUTES.HOME }, { label: '404' }],
  },
];


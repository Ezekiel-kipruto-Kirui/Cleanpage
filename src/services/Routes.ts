import Dashboard from "@/pages/Index";

export const ROUTES = {


    dashboard:"/dashboard",
    reports: "/performance-report",
    siteManagement: "/site-management",
    userprofile: "/user-profile",

    laundryDashboard: "/laundry-dashboard",
    laundryCreateOrder: "/laundry/create-order",
    laundryOrders: "/laundry/orders",
    laundryCustomers: "/laundry/customers",
    laundryExpenses: "/laundry/expenses",

    fooditems: "/hotel/food-items",
    hotelOrders: "/hotel/orders",
    hotelExpenses: "/hotel/expenses",

    login: "/login",
    notFound: "*",
} as const;

/** Response from GET /api/analytics/overview */
export type AnalyticsOverviewResponse = {
  signupByDay: Array<{ date: string; count: number }>;
  kpis: {
    newUsersThisWeek: number;
    newUsersPriorWeek: number;
    percentChangeVsPriorWeek: number | null;
    profileCompletionRate: number;
  };
};

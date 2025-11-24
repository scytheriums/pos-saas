import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

// Define the steps for the tour. Selectors target IDs added in the analytics page.
const steps: Step[] = [
    {
        target: '#sidebar',
        title: 'Navigation Sidebar',
        content: 'Use the sidebar to quickly jump between sections of the dashboard.',
        placement: 'right',
    },
    {
        target: '#metric-cards',
        title: 'Key Metrics',
        content: "These cards show today's total revenue, orders, and average order value.",
        placement: 'bottom',
    },
    {
        target: '#sales-chart',
        title: 'Sales Trends',
        content: 'A chart of revenue and orders over the last 7 days.',
        placement: 'top',
    },
    {
        target: '#low-stock',
        title: 'Low Stock Alerts',
        content: 'Items that are running low are listed here so you can restock quickly.',
        placement: 'top',
    },
];

export function DashboardTour() {
    const [run, setRun] = useState(false);

    // Show the tour only once per browser (localStorage flag)
    useEffect(() => {
        const completed = localStorage.getItem('dashboardTourCompleted');
        if (!completed) {
            setRun(true);
        }
    }, []);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status as any)) {
            localStorage.setItem('dashboardTourCompleted', 'true');
            setRun(false);
        }
    };

    return (
        <Joyride
            steps={steps}
            run={run}
            continuous
            showSkipButton
            scrollToFirstStep
            callback={handleJoyrideCallback}
            styles={{
                options: {
                    zIndex: 10000,
                },
            }}
        />
    );
}

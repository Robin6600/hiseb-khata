// DOM Elements
const btnMonthly = document.getElementById('btn-monthly');
const btnYearly = document.getElementById('btn-yearly');
const selectYear = document.getElementById('select-year');
const selectMonth = document.getElementById('select-month');

const elIncome = document.getElementById('report-income');
const elExpense = document.getElementById('report-expense');
const elBalance = document.getElementById('report-balance');
const tableBody = document.getElementById('report-table-body');

const themeIcon = document.getElementById('theme-icon');

// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentType = 'monthly'; // 'monthly' or 'yearly'
let mainChart = null;
let categoryChart = null;

// Init
function init() {
    loadTheme();
    populateYears();

    // Set default selection to current date
    const today = new Date();
    selectMonth.value = today.getMonth();
    selectYear.value = today.getFullYear();

    // Initial Render
    updateReport();
}

function loadTheme() {
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
}

function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
    // Re-render charts to update colors if needed
    updateReport();
}

// Download Excel
function downloadExcel() {
    const year = selectYear.value;
    const monthIndex = selectMonth.value;
    const monthName = selectMonth.options[selectMonth.selectedIndex].text;
    const fileName = currentType === 'monthly' ? `Report_${monthName}_${year}.xlsx` : `Report_${year}.xlsx`;

    // Filter Transactions (same logic as updateReport)
    let filtered = transactions.filter(t => {
        const d = new Date(t.date);
        const matchYear = d.getFullYear() === parseInt(year);
        if (currentType === 'monthly') {
            return matchYear && d.getMonth() === parseInt(monthIndex);
        }
        return matchYear;
    });

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Prepare data for Excel
    // Columns: Date, Category, Description, Income, Expense, Balance
    let runningBalance = 0; // If we wanted a running balance in the sheet, but simpler to just show what's there
    
    // Actually, balance per row depends on total starting balance which we don't have easily per period
    // The requirement says "Balance" column. Let's provide it as a calculated field or just the totals.
    // Usually "Balance" in a ledger sheet is (Income - Expense) for that row + previous balance.
    // For a report, maybe it's better to just show the row's impact.
    
    const excelData = filtered.map(t => {
        const isIncome = t.type === 'income';
        return {
            'Date': new Date(t.date).toLocaleDateString(),
            'Category': t.category,
            'Description': t.description,
            'Income': isIncome ? t.amount : 0,
            'Expense': !isIncome ? t.amount : 0,
            'Balance': isIncome ? t.amount : -t.amount
        };
    });

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add Auto-filter
    const range = XLSX.utils.decode_range(ws['!ref']);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");

    // Save File
    XLSX.writeFile(wb, fileName);
}

function populateYears() {
    // Current Year
    const currentYear = new Date().getFullYear();
    // Range: 2000 to 2050 (50 Years Future / 25 Past) - "Unlimited" feel
    for (let i = 2000; i <= 2050; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = i;
        selectYear.appendChild(option);
    }
    selectYear.value = currentYear;
}

function setReportType(type) {
    currentType = type;

    // Update UI Toggles
    if (type === 'monthly') {
        btnMonthly.classList.remove('bg-transparent', 'text-gray-500', 'dark:text-gray-400');
        btnMonthly.classList.add('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'text-primary');

        btnYearly.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400');
        btnYearly.classList.remove('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'text-primary');

        selectMonth.classList.remove('hidden');
    } else {
        btnYearly.classList.remove('bg-transparent', 'text-gray-500', 'dark:text-gray-400');
        btnYearly.classList.add('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'text-primary');

        btnMonthly.classList.add('bg-transparent', 'text-gray-500', 'dark:text-gray-400');
        btnMonthly.classList.remove('bg-white', 'dark:bg-slate-600', 'shadow-sm', 'text-primary');

        selectMonth.classList.add('hidden');
    }

    updateReport();
}

function updateReport() {
    const year = parseInt(selectYear.value);
    const month = parseInt(selectMonth.value);

    // Filter Transactions
    let filtered = transactions.filter(t => {
        const d = new Date(t.date);
        const matchYear = d.getFullYear() === year;
        if (currentType === 'monthly') {
            return matchYear && d.getMonth() === month;
        }
        return matchYear;
    });

    // Calculate Totals
    const totalIncome = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Update Cards
    elIncome.innerText = `৳${totalIncome.toFixed(2)}`;
    elExpense.innerText = `৳${totalExpense.toFixed(2)}`;
    elBalance.innerText = `৳${balance.toFixed(2)}`;

    updateTable(filtered);

    if (currentType === 'monthly') {
        renderMonthlyCharts(filtered, year, month);
    } else {
        renderYearlyCharts(filtered, year);
    }
}

function updateTable(data) {
    tableBody.innerHTML = '';

    // Sort by date desc
    const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-gray-400 italic">No records found for this period.</td></tr>`;
        return;
    }

    sorted.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors';
        const isIncome = t.type === 'income';

        const incomeTxt = isIncome ? `+৳${t.amount.toFixed(2)}` : '-';
        const expenseTxt = !isIncome ? `-৳${t.amount.toFixed(2)}` : '-';
        const incomeClass = isIncome ? 'text-emerald-500 font-medium' : 'text-gray-300';
        const expenseClass = !isIncome ? 'text-rose-500 font-medium' : 'text-gray-300';

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">${new Date(t.date).toLocaleDateString()}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200"><span class="px-2 py-1 rounded-full text-xs font-semibold ${isIncome ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}">${t.category}</span></td>
            <td class="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">${t.description}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right ${incomeClass}">${incomeTxt}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-right ${expenseClass}">${expenseTxt}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function renderMonthlyCharts(data, year, month) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    // 1. Category Breakdown (Doughnut)
    updateCategoryChart(data, textColor);

    // 2. Main Chart: Daily Expense Trend
    const ctx = document.getElementById('mainChart').getContext('2d');

    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Aggregate income and expense by day
    const incomeData = new Array(daysInMonth).fill(0);
    const expenseData = new Array(daysInMonth).fill(0);

    data.forEach(t => {
        const d = new Date(t.date).getDate();
        if (t.type === 'income') incomeData[d - 1] += t.amount;
        else expenseData[d - 1] += t.amount;
    });

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    backgroundColor: '#ef4444',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

function renderYearlyCharts(data, year) {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#cbd5e1' : '#475569';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    // 1. Category Breakdown (Doughnut)
    updateCategoryChart(data, textColor);

    // 2. Main Chart: Monthly Comparison
    const ctx = document.getElementById('mainChart').getContext('2d');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const incomeData = new Array(12).fill(0);
    const expenseData = new Array(12).fill(0);

    data.forEach(t => {
        const m = new Date(t.date).getMonth();
        if (t.type === 'income') incomeData[m] += t.amount;
        else expenseData[m] += t.amount;
    });

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'bar', // or 'line'
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                },
                {
                    label: 'Expense',
                    data: expenseData,
                    backgroundColor: '#ef4444',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

function updateCategoryChart(data, textColor) {
    const ctx = document.getElementById('categoryChart').getContext('2d');

    // Aggregate ONLY expenses
    const expenses = data.filter(t => t.type === 'expense');
    const catMap = {};
    expenses.forEach(t => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(catMap);
    const values = Object.values(catMap);

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
    ];

    if (categoryChart) categoryChart.destroy();

    // Handle empty data
    if (values.length === 0) {
        // Render a placeholder or just leave empty? chart.js handles empty well usually
        // Let's create an empty chart or simple logic
        // For professional look, maybe show "No expenses" text overlay?
        // We'll just render empty chart for now
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: [], datasets: [] },
            options: { plugins: { title: { display: true, text: 'No Expenses' } } }
        });
        return;
    }

    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, padding: 20, usePointStyle: true }
                }
            }
        }
    });
}

init();

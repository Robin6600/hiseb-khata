// DOM Elements
const balanceEL = document.getElementById('balance-amount');
const incomeEL = document.getElementById('income-amount');
const expenseEL = document.getElementById('expense-amount');
const list = document.getElementById('transaction-list');
const form = document.getElementById('transaction-form');
const description = document.getElementById('description');
const amount = document.getElementById('amount');
const type = document.getElementById('type');
const category = document.getElementById('category');
const date = document.getElementById('date');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const transactionIdField = document.getElementById('transaction-id');
const filterType = document.getElementById('filter-type');
const searchInput = document.getElementById('search-input');
const themeIcon = document.getElementById('theme-icon');
const voiceFab = document.getElementById('voice-fab');
const voiceOverlay = document.getElementById('voice-overlay');
const closeVoiceBtn = document.getElementById('close-voice');

// Categories
const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gift', 'Other'];
const expenseCategories = ['Food', 'Rent', 'Utilities', 'Transportation', 'Entertainment', 'Health', 'Shopping', 'Other'];

// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let editMode = false;
let myChart; // Chart instance

// Initialize App
function init() {
    // Set Date to Today
    date.valueAsDate = new Date();

    // Load Theme
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        document.documentElement.classList.remove('dark');
    }

    updateCategories();
    renderList();
    updateValues();
    updateChart();
}

// Update Categories based on Type
function updateCategories() {
    const selectedType = type.value;
    category.innerHTML = ''; // Clear existing

    const cats = selectedType === 'income' ? incomeCategories : expenseCategories;

    cats.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.innerText = cat;
        category.appendChild(option);
    });
}

// Add Transaction
function addTransaction(e) {
    e.preventDefault();

    if (description.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add a description and amount');
        return;
    }

    const transaction = {
        id: editMode ? transactionIdField.value : generateID(),
        description: description.value,
        amount: +amount.value,
        type: type.value,
        category: category.value,
        date: date.value
    };

    if (editMode) {
        // Update existing
        const index = transactions.findIndex(t => t.id === transaction.id);
        if (index !== -1) {
            transactions[index] = transaction;
        }
        editMode = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Transaction';
        submitBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
        submitBtn.classList.add('bg-primary', 'hover:bg-indigo-600');
        cancelEditBtn.classList.add('hidden');
        cancelEditBtn.classList.remove('flex');
    } else {
        // Add new
        transactions.push(transaction);
    }

    updateLocalStorage();
    renderList();
    updateValues();
    updateChart();
    resetForm();
}

// Generate Random ID
function generateID() {
    return Math.floor(Math.random() * 100000000).toString();
}

// Render List
function renderList() {
    const searchTerm = searchInput.value.toLowerCase();
    const filter = filterType.value;

    list.innerHTML = '';

    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = transaction.description.toLowerCase().includes(searchTerm) || transaction.category.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || transaction.type === filter;
        return matchesSearch && matchesFilter;
    });

    if (filteredTransactions.length === 0) {
        list.innerHTML = `
            <tr class="text-center text-gray-400 py-8">
                <td colspan="5" class="py-8">No transactions found.</td>
            </tr>
        `;
        return;
    }

    // Sort by Date (Newest first)
    filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    filteredTransactions.forEach(transaction => {
        const sign = transaction.type === 'income' ? '+' : '-';
        const colorClass = transaction.type === 'income' ? 'text-success' : 'text-danger';
        const item = document.createElement('tr');

        item.className = 'border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition';

        item.innerHTML = `
            <td class="py-3 px-2">
                <div class="font-medium text-gray-800 dark:text-gray-200">${transaction.description}</div>
            </td>
            <td class="py-3 px-2">
                <span class="text-xs font-semibold px-2 py-1 rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}">
                    ${transaction.category}
                </span>
            </td>
            <td class="py-3 px-2 text-gray-500 dark:text-gray-400 text-sm">
                ${new Date(transaction.date).toLocaleDateString()}
            </td>
            <td class="py-3 px-2 text-right font-bold ${colorClass}">
                ${sign}৳${Math.abs(transaction.amount).toFixed(2)}
            </td>
            <td class="py-3 px-2 text-center">
                <button class="text-blue-500 hover:text-blue-700 mx-1" onclick="editTransaction('${transaction.id}')" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="text-red-500 hover:text-red-700 mx-1" onclick="deleteTransaction('${transaction.id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        list.appendChild(item);
    });
}

// Update Values (Balance, Income, Expense)
function updateValues() {
    const amounts = transactions.map(transaction => transaction.type === 'income' ? transaction.amount : -transaction.amount);

    const total = amounts.reduce((acc, item) => acc + item, 0).toFixed(2);

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0)
        .toFixed(2);

    const expense = (transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0) * -1)
        .toFixed(2);

    balanceEL.innerText = `৳${total}`;
    incomeEL.innerText = `+৳${income}`;
    expenseEL.innerText = `-৳${Math.abs(expense)}`;

    // Balance Color Logic
    if (total < 0) {
        balanceEL.className = 'text-3xl font-bold mt-2 text-danger';
    } else {
        balanceEL.className = 'text-3xl font-bold mt-2 text-success';
    }
}

// Delete Transaction
function deleteTransaction(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(transaction => transaction.id !== id);
        updateLocalStorage();
        renderList();
        updateValues();
        updateChart();
    }
}

// Edit Transaction
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Populate Form
    description.value = transaction.description;
    amount.value = transaction.amount;
    type.value = transaction.type;
    date.value = transaction.date;
    transactionIdField.value = transaction.id;

    // Update categories first to ensure correct category is selected
    updateCategories();
    category.value = transaction.category;

    // UI Changes
    editMode = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Transaction';
    submitBtn.classList.remove('bg-primary', 'hover:bg-indigo-600');
    submitBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600');

    cancelEditBtn.classList.remove('hidden');
    cancelEditBtn.classList.add('flex');

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

// Reset Form
function resetForm() {
    form.reset();
    date.valueAsDate = new Date();
    updateCategories();

    editMode = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Transaction';
    submitBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600');
    submitBtn.classList.add('bg-primary', 'hover:bg-indigo-600');
    cancelEditBtn.classList.add('hidden');
    cancelEditBtn.classList.remove('flex');
}

// Update Local Storage
function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Chart.js - Update Chart
function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // Aggregate expenses by category
    const categoryTotals = {};
    transactions.forEach(t => {
        if (t.type === 'expense') {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        }
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // Empty state for chart
    if (labels.length === 0) {
        if (myChart) {
            myChart.destroy();
            myChart = null;
        }
        // Optionally show "No Data" text on canvas parent
        return;
    }

    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
    ];

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Expenses',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
}

// Export Data
function exportData() {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Import Data
function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if (confirm('Importing will replace your current data. Are you sure?')) {
                    transactions = data;
                    updateLocalStorage();
                    init();
                    alert('Data imported successfully!');
                }
            } else {
                alert('Invalid file format.');
            }
        } catch (err) {
            alert('Error reading file.');
        }
    };
    reader.readAsText(file);
    // Reset input
    input.value = '';
}

// Toggle Theme
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
}

// Filter Functions
function filterTransactions() {
    renderList();
}

// Event Listeners
form.addEventListener('submit', addTransaction);
type.addEventListener('change', updateCategories);

// --- Voice Assistant Implementation ---

let recognition;
let silenceTimer;
if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'bn-BD'; // Bangla (Bangladesh)

    recognition.onstart = () => {
        voiceOverlay.classList.remove('hidden');
        document.getElementById('interim-transcript').innerText = '';
        setTimeout(() => voiceOverlay.classList.add('active'), 10);
        resetSilenceTimer();
    };

    recognition.onresult = (event) => {
        resetSilenceTimer();
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript;
                processVoiceCommand(transcript);
                // We don't stop immediately in continuous mode unless we want to, 
                // but for a single transaction, stopping after a final result + silence is better.
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        document.getElementById('interim-transcript').innerText = interimTranscript;
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') stopVoiceUI();
    };

    recognition.onend = () => {
        clearTimeout(silenceTimer);
    };
}

function resetSilenceTimer() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
        if (recognition) {
            recognition.stop();
            const currentTranscript = document.getElementById('interim-transcript').innerText;
            if (currentTranscript.trim()) {
                processVoiceCommand(currentTranscript);
            }
            stopVoiceUI();
        }
    }, 3000); // 3 seconds of silence to stop
}

function stopVoiceUI() {
    voiceOverlay.classList.remove('active');
    setTimeout(() => voiceOverlay.classList.add('hidden'), 500);
}

let lastProcessedTranscript = '';

function isolateSubject(text) {
    // Remove numbers and multipliers
    let clean = text.replace(/\d+/g, '').replace(/[০-৯]/g, '');
    const noise = [
        'হাজার', 'শ', 'শো', 'লাখ', 'টাকা', 'পয়সা', 
        'দিলাম', 'পেলাম', 'খরচ', 'করলাম', 'জমা', 'আয়', 'বেতন', 'স্যালারি', 'রিসিভড', 'পেয়েছি', 'দিয়েছি', 'শোধ', 'পাঠালাম',
        'জন্য', 'একটা', 'আজ', 'এখন', 'পরশু', 'গতকাল', 'কাল', 'করেছি', 'হয়েছে'
    ];
    
    noise.forEach(word => {
        const regex = new RegExp(word, 'g');
        clean = clean.replace(regex, '');
    });
    
    return clean.trim().replace(/\s+/g, ' ');
}

function translateToEnglish(subject) {
    const dictionary = {
        'খাবার': 'Food', 'নাস্তা': 'Breakfast', 'দুপুরের খাবার': 'Lunch', 'রাতের খাবার': 'Dinner', 'বিরিয়ানি': 'Biryani',
        'বাজার': 'Groceries', 'সবজি': 'Vegetables', 'মাছ': 'Fish', 'মাংস': 'Meat', 'ডিম': 'Eggs', 'দুধ': 'Milk',
        'ভাড়া': 'Rent', 'অফিস': 'Office', 'বাসা': 'Home',
        'বিদ্যুৎ': 'Electricity Bill', 'গ্যাস': 'Gas Bill', 'পানি': 'Water Bill', 'কারেন্ট': 'Current Bill', 'ওয়াইফাই': 'WiFi Bill', 'ইন্টারনেট': 'Internet Bill',
        'যাতায়াত': 'Transportation', 'রিকশা': 'Rickshaw', 'বাস': 'Bus Fare', 'উবার': 'Uber', 'পাঠাও': 'Pathao', 'তেল': 'Fuel', 'পেট্রোল': 'Petrol',
        'শপিং': 'Shopping', 'জামা': 'Clothes', 'জুতা': 'Shoes', 'ঘড়ি': 'Watch', 'বই': 'Book',
        'উপহার': 'Gift', 'গিফট': 'Gift',
        'মেডিসিন': 'Medicine', 'ডাক্তার': 'Doctor Fee', 'হাসপাতাল': 'Hospital', 'ঔষধ': 'Medicine',
        'মুভি': 'Movie', 'সিনেমা': 'Cinema', 'পার্ক': 'Park', 'আড্ডা': 'Hangout',
        'মোবাইল': 'Mobile Recharge', 'রিচার্জ': 'Recharge'
    };

    // Try to find a match in the dictionary
    for (const [bn, en] of Object.entries(dictionary)) {
        if (subject.includes(bn)) return en;
    }

    // Capitalize first letter of subject if no translation found
    return subject.charAt(0).toUpperCase() + subject.slice(1);
}

function processVoiceCommand(text) {
    if (!text || text.trim() === lastProcessedTranscript) return;
    lastProcessedTranscript = text.trim();
    
    console.log('Voice Command:', text);
    
    const banglaToEnglishMap = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    
    let normalizedText = text.toLowerCase().replace(/[০-৯]/g, s => banglaToEnglishMap[s]);
    
    const numberMap = {
        'এক': 1, 'দুই': 2, 'তিন': 3, 'চার': 4, 'পাঁচ': 5, 'ছয়': 6, 'সাত': 7, 'আট': 8, 'নয়': 9, 'দশ': 10,
        'বিশ': 20, 'ত্রিশ': 30, 'চল্লিশ': 40, 'পঞ্চাশ': 50
    };
    
    const multiplierMap = { 'হাজার': 1000, 'শ': 100, 'শো': 100, 'লাখ': 100000 };

    let parsedAmount = 0;
    let digitMatch = normalizedText.match(/\d+/);
    if (digitMatch) {
        parsedAmount = parseInt(digitMatch[0]);
        for (const [key, value] of Object.entries(multiplierMap)) {
            if (normalizedText.includes(digitMatch[0] + ' ' + key) || normalizedText.includes(digitMatch[0] + key)) {
                parsedAmount *= value;
                break;
            }
        }
    } else {
        for (const [key, value] of Object.entries(numberMap)) {
            if (normalizedText.includes(key)) {
                parsedAmount = value;
                for (const [mKey, mValue] of Object.entries(multiplierMap)) {
                    if (normalizedText.includes(key + ' ' + mKey) || normalizedText.includes(key + mKey)) {
                        parsedAmount *= mValue;
                        break;
                    }
                }
                if (parsedAmount > 0) break;
            }
        }
    }

    let parsedType = 'expense';
    const incomeKeywords = ['পেলাম', 'জমা', 'আয়', 'আসল', 'বেতন', 'স্যালারি', 'বকশিশ', 'উপহার', 'পাবো', 'ঢুকলো', 'ইনকাম', 'রিসিভড', 'পেয়েছি', 'লাভ'];
    const expenseKeywords = ['খরচ', 'দিলাম', 'গেল', 'কিনলাম', 'কেনাকাটা', 'ভাড়া', 'বিল', 'পেমেন্ট', 'ব্যয়', 'মাইনাস', 'দিয়েছি', 'শোধ', 'পাঠালাম'];

    if (incomeKeywords.some(word => normalizedText.includes(word))) {
        parsedType = 'income';
    } else if (expenseKeywords.some(word => normalizedText.includes(word))) {
        parsedType = 'expense';
    }

    // Advanced: Isolate subject and translate
    const subject = isolateSubject(normalizedText);
    const translatedDescription = translateToEnglish(subject);

    let parsedCategory = 'Other';
    const catMap = {
        'Food': ['খাবার', 'নাস্তা', 'বিরিয়ানি', 'লাঞ্চ', 'ডিনার', 'ডিম', 'দুধ', 'মাছ', 'মাংস', 'সবজি', 'বাজার'],
        'Salary': ['বেতন', 'স্যালারি'],
        'Rent': ['ভাড়া', 'অফিস', 'বাসা'],
        'Utilities': ['বিদ্যুৎ', 'গ্যাস', 'पानी', 'কারেন্ট', 'ওয়াইফাই', 'ইন্টারনেট', 'মোবাইল', 'রিচার্জ', 'বিল'],
        'Transportation': ['যাতায়াত', 'রিকশা', 'বাস', 'উবার', 'পাঠাও', 'তেল', 'পেট্রোল'],
        'Shopping': ['শপিং', 'বাজার', 'জামা', 'জুতা', 'ঘড়ি', 'বই', 'কেনাকাটা'],
        'Gift': ['উপহার', 'গিফট'],
        'Freelance': ['ফ্রিল্যান্স', 'আপওয়ার্ক', 'ফাইভার'],
        'Investments': ['ইনভেস্ট', 'শেয়ার', 'ট্রেডিং'],
        'Health': ['মেডিসিন', 'ডাক্তার', 'হাসপাতাল', 'ঔষধ'],
        'Entertainment': ['মুভি', 'সিনেমা', 'পার্ক', 'আড্ডা']
    };

    // Score categories based on subject first, then raw text
    let topCategory = 'Other';
    let maxMatches = 0;

    for (const [cat, keywords] of Object.entries(catMap)) {
        let matches = 0;
        keywords.forEach(key => {
            if (subject.includes(key)) matches += 2; // Weight subject higher
            else if (normalizedText.includes(key)) matches += 1;
        });
        if (matches > maxMatches) {
            maxMatches = matches;
            topCategory = cat;
        }
    }
    parsedCategory = topCategory;

    let parsedDate = new Date();
    if (normalizedText.includes('কাল') || normalizedText.includes('গতকাল')) {
        parsedDate.setDate(parsedDate.getDate() - 1);
    } else if (normalizedText.includes('পরশু')) {
        parsedDate.setDate(parsedDate.getDate() - 2);
    }

    if (parsedAmount > 0) {
        // Construct natural English description
        let finalDescription = translatedDescription || subject || parsedCategory;
        finalDescription += (parsedType === 'income' ? ' (Received)' : ' (Spent)');
        
        description.value = finalDescription; 
        amount.value = parsedAmount;
        type.value = parsedType;
        updateCategories();
        category.value = parsedCategory;
        date.valueAsDate = parsedDate;

        document.getElementById('submit-btn').click();
        showNotification(`Added: ${parsedAmount} for ${finalDescription}`);
    } else {
        console.log("No amount detected in:", normalizedText);
    }
}

function showNotification(msg) {
    // Simple toast or alert
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-pulse';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

voiceFab.addEventListener('click', () => {
    if (recognition) {
        try {
            recognition.start();
        } catch (e) {
            recognition.stop();
        }
    } else {
        alert("Speech Recognition not supported in this browser.");
    }
});

closeVoiceBtn.addEventListener('click', () => {
    if (recognition) recognition.stop();
    stopVoiceUI();
});

// Init on load
init();

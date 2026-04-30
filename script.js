// State Management
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let debts = JSON.parse(localStorage.getItem('debts')) || [];
let filterDate = ''; // YYYY-MM-DD
let searchText = ''; 
let flowChartInstance = null;
let debtChartInstance = null;

// DOM Elements
const balanceEl = document.getElementById('balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expenses');
const debtEl = document.getElementById('total-debt');
const transactionList = document.getElementById('transaction-list');
const debtList = document.getElementById('debt-list');
const transactionForm = document.getElementById('transaction-form');
const debtForm = document.getElementById('debt-form');

// Tab Switching Logic
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    transactionForm.style.display = 'none';
    debtForm.style.display = 'none';
    const paymentForm = document.getElementById('payment-form');
    paymentForm.style.display = 'none';
    
    if (tab === 'transaction') {
        document.querySelector('.tab:nth-child(1)').classList.add('active');
        transactionForm.style.display = 'block';
    } else if (tab === 'debt') {
        document.querySelector('.tab:nth-child(2)').classList.add('active');
        debtForm.style.display = 'block';
    } else if (tab === 'payment') {
        document.querySelector('.tab:nth-child(3)').classList.add('active');
        paymentForm.style.display = 'block';
    }
}

// Format Currency
function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(num);
}

// Update Dashboard
function updateUI() {
    // Transactions calculations
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
    
    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);
    
    const balance = income - expenses;

    // Debt calculations
    const totalDebt = debts.reduce((acc, d) => acc + d.amount, 0);

    // Update Cards
    balanceEl.innerText = formatCurrency(balance);
    incomeEl.innerText = formatCurrency(income);
    expenseEl.innerText = formatCurrency(expenses);
    debtEl.innerText = formatCurrency(totalDebt);

    // Render Lists and Selectors
    renderTransactions();
    renderDebts();
    populateDebtSelect();
    updateCharts(income, expenses, balance, totalDebt);
}

function updateCharts(income, expenses, balance, totalDebt) {
    const ctxFlow = document.getElementById('flowChart').getContext('2d');
    const ctxDebt = document.getElementById('debtChart').getContext('2d');

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    const incomeColor = getComputedStyle(document.documentElement).getPropertyValue('--income').trim();
    const expenseColor = getComputedStyle(document.documentElement).getPropertyValue('--expense').trim();
    const textColor = '#ffffff';

    // Chart 1: Flow Comparison (Ingresos vs Egresos vs Balance)
    if (flowChartInstance) {
        flowChartInstance.data.datasets[0].data = [income, expenses, balance];
        flowChartInstance.update();
    } else {
        flowChartInstance = new Chart(ctxFlow, {
            type: 'bar',
            data: {
                labels: ['Ingresos', 'Gastos', 'Balance'],
                datasets: [{
                    label: 'Flujo de Caja',
                    data: [income, expenses, balance],
                    backgroundColor: [incomeColor, expenseColor, 'rgba(255,255,255,0.2)'],
                    borderWidth: 0,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        if (index === 0) openDetailsModal('income');
                        if (index === 1) openDetailsModal('expense');
                        if (index === 2) openDetailsModal('balance');
                    }
                },
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                    x: { grid: { display: false }, ticks: { color: '#888' } }
                }
            }
        });
    }

    // Chart 2: Balance vs Debt
    if (debtChartInstance) {
        debtChartInstance.data.datasets[0].data = [balance > 0 ? balance : 0, totalDebt];
        debtChartInstance.update();
    } else {
        debtChartInstance = new Chart(ctxDebt, {
            type: 'doughnut',
            data: {
                labels: ['Balance', 'Deuda'],
                datasets: [{
                    data: [balance > 0 ? balance : 0, totalDebt],
                    backgroundColor: ['rgba(255,255,255,0.1)', expenseColor],
                    borderColor: '#0a0a0a',
                    borderWidth: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#888', font: { family: 'Outfit', size: 12 } }
                    }
                },
                cutout: '80%'
            }
        });
    }
}

function populateDebtSelect() {
    const select = document.getElementById('select-debt');
    select.innerHTML = '<option value="">-- Selecciona una deuda --</option>';
    
    debts.forEach((d, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${d.desc} (${formatCurrency(d.amount)})`;
        select.appendChild(option);
    });
}

// Render Transactions
function renderTransactions() {
    transactionList.innerHTML = '';
    
    let filteredTransactions = transactions;
    
    // Combine filters
    if (filterDate || searchText) {
        filteredTransactions = transactions.filter(t => {
            const matchesDate = filterDate ? t.date === filterDate : true;
            const matchesText = searchText ? t.desc.toLowerCase().includes(searchText.toLowerCase()) : true;
            return matchesDate && matchesText;
        });
    }
    
    if (filteredTransactions.length === 0) {
        const msg = (filterDate || searchText) ? 'No se encontraron movimientos con esos filtros.' : 'No hay movimientos registrados.';
        transactionList.innerHTML = `<div class="empty-state">${msg}</div>`;
        return;
    }

    filteredTransactions.slice().reverse().forEach((t) => {
        // Find original index for deletion
        const originalIndex = transactions.indexOf(t);
        
        const item = document.createElement('div');
        item.className = 'item';
        
        item.innerHTML = `
            <div class="item-info">
                <h4>${t.desc}</h4>
                <p>${new Date(t.date + 'T00:00:00').toLocaleDateString()}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="item-amount ${t.type === 'income' ? 'plus' : 'minus'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </span>
                <button class="delete-btn" onclick="deleteTransaction(${originalIndex})">✕</button>
            </div>
        `;
        transactionList.appendChild(item);
    });
}

// Render Debts
function renderDebts() {
    debtList.innerHTML = '';
    
    if (debts.length === 0) {
        debtList.innerHTML = '<div class="empty-state">No tienes deudas pendientes.</div>';
        return;
    }

    debts.forEach((d, index) => {
        const item = document.createElement('div');
        item.className = 'item';
        
        item.innerHTML = `
            <div class="item-info">
                <h4>${d.desc}</h4>
                <p>Pendiente</p>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem;">
                <span class="item-amount pending">${formatCurrency(d.amount)}</span>
                <button class="delete-btn" onclick="deleteDebt(${index})">✕</button>
            </div>
        `;
        debtList.appendChild(item);
    });
}

// Add Transaction
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get date in local YYYY-MM-DD format
    const now = new Date();
    const localDate = now.toISOString().split('T')[0];
    
    const newTransaction = {
        desc: document.getElementById('desc').value,
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        date: localDate
    };
    
    transactions.push(newTransaction);
    saveData();
    updateUI();
    transactionForm.reset();
});

// Add Debt
debtForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const newDebt = {
        id: Date.now(),
        desc: document.getElementById('debt-desc').value,
        amount: parseFloat(document.getElementById('debt-amount').value)
    };
    
    debts.push(newDebt);
    saveData();
    updateUI();
    debtForm.reset();
});

// Add Payment (Abono)
document.getElementById('payment-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const debtIndex = document.getElementById('select-debt').value;
    const amountToPay = parseFloat(document.getElementById('payment-amount').value);
    
    if (debtIndex === "" || isNaN(amountToPay)) return;
    
    const debt = debts[debtIndex];
    const now = new Date();
    const localDate = now.toISOString().split('T')[0];
    
    // 1. Decrease debt
    debt.amount -= amountToPay;
    
    // 2. Add as expense transaction
    const paymentTransaction = {
        desc: `Abono a deuda: ${debt.desc}`,
        amount: amountToPay,
        type: 'expense',
        date: localDate
    };
    transactions.push(paymentTransaction);
    
    // 3. Cleanup if debt is paid off
    if (debt.amount <= 0) {
        debts.splice(debtIndex, 1);
    }
    
    saveData();
    updateUI();
    document.getElementById('payment-form').reset();
    switchTab('transaction'); // Show the payment in the history
});

// Filter Handlers
document.getElementById('date-filter').addEventListener('change', (e) => {
    filterDate = e.target.value;
    renderTransactions();
});

document.getElementById('search-input').addEventListener('input', (e) => {
    searchText = e.target.value;
    renderTransactions();
});

document.getElementById('clear-filter').addEventListener('click', () => {
    filterDate = '';
    searchText = '';
    document.getElementById('date-filter').value = '';
    document.getElementById('search-input').value = '';
    renderTransactions();
});

// Delete Functions
function deleteTransaction(index) {
    transactions.splice(index, 1);
    saveData();
    updateUI();
}

function deleteDebt(index) {
    debts.splice(index, 1);
    saveData();
    updateUI();
}

// Persistence
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('debts', JSON.stringify(debts));
}

// Modal Logic
function openDetailsModal(type) {
    const modal = document.getElementById('details-modal');
    const title = document.getElementById('modal-title');
    const tbody = document.getElementById('modal-body');
    
    if (type === 'income') title.innerText = 'Detalle de Ingresos';
    else if (type === 'expense') title.innerText = 'Detalle de Gastos';
    else title.innerText = 'Historial Completo (Balance)';
    
    let filteredTransactions;
    if (type === 'balance') {
        filteredTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
        filteredTransactions = transactions
            .filter(t => t.type === type)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    tbody.innerHTML = '';
    
    if (filteredTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 2rem;">No hay registros</td></tr>`;
    } else {
        let totalIncome = 0;
        let totalExpense = 0;

        filteredTransactions.forEach(t => {
            const row = document.createElement('tr');
            const isIncome = t.type === 'income';
            if (isIncome) totalIncome += t.amount;
            else totalExpense += t.amount;

            const colorVar = isIncome ? 'var(--income)' : 'var(--expense)';
            const sign = isIncome ? '+' : '-';
            
            row.innerHTML = `
                <td>${new Date(t.date + 'T00:00:00').toLocaleDateString()}</td>
                <td>${t.desc}</td>
                <td style="font-weight: 600; color: ${colorVar}">${sign}${formatCurrency(t.amount)}</td>
            `;
            tbody.appendChild(row);
        });

        // Add Totals Footer
        const footer = document.createElement('tr');
        footer.style.borderTop = '2px solid var(--border)';
        footer.style.background = 'rgba(255,255,255,0.02)';
        
        if (type === 'income') {
            footer.innerHTML = `
                <td colspan="2" style="text-align: right; padding: 1.5rem; color: var(--text-muted);">TOTAL INGRESOS:</td>
                <td style="padding: 1.5rem; font-weight: 700; font-size: 1.1rem;">${formatCurrency(totalIncome)}</td>
            `;
            tbody.appendChild(footer);
        } else if (type === 'expense') {
            footer.innerHTML = `
                <td colspan="2" style="text-align: right; padding: 1.5rem; color: var(--text-muted);">TOTAL GASTOS:</td>
                <td style="padding: 1.5rem; font-weight: 700; font-size: 1.1rem; color: var(--primary);">${formatCurrency(totalExpense)}</td>
            `;
            tbody.appendChild(footer);
        } else {
            // Balance Modal - Show all three
            const incomeRow = document.createElement('tr');
            incomeRow.style.borderTop = '2px solid var(--border)';
            incomeRow.innerHTML = `
                <td colspan="2" style="text-align: right; padding: 1rem; color: var(--text-muted); font-size: 0.8rem;">TOTAL INGRESOS:</td>
                <td style="padding: 1rem; font-weight: 600;">${formatCurrency(totalIncome)}</td>
            `;
            tbody.appendChild(incomeRow);

            const expenseRow = document.createElement('tr');
            expenseRow.innerHTML = `
                <td colspan="2" style="text-align: right; padding: 0.5rem 1rem; color: var(--text-muted); font-size: 0.8rem;">TOTAL GASTOS:</td>
                <td style="padding: 0.5rem 1rem; font-weight: 600; color: var(--primary);">${formatCurrency(totalExpense)}</td>
            `;
            tbody.appendChild(expenseRow);

            const balanceRow = document.createElement('tr');
            balanceRow.style.background = 'rgba(255,255,255,0.05)';
            const finalBalance = totalIncome - totalExpense;
            balanceRow.innerHTML = `
                <td colspan="2" style="text-align: right; padding: 1.5rem; font-weight: 600;">BALANCE NETO:</td>
                <td style="padding: 1.5rem; font-weight: 700; font-size: 1.2rem; color: ${finalBalance >= 0 ? 'var(--income)' : 'var(--expense)'};">
                    ${formatCurrency(finalBalance)}
                </td>
            `;
            tbody.appendChild(balanceRow);
        }
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('details-modal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('details-modal');
    if (event.target == modal) {
        closeModal();
    }
}

// Initial Load
updateUI();

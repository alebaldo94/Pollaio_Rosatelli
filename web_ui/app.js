/**
 * Pollaio Automatizzato - Web UI
 * JavaScript Application
 */

// Configuration
const CONFIG = {
    apiUrl: localStorage.getItem('apiUrl') || 'http://localhost:5000/api',
    updateInterval: parseInt(localStorage.getItem('updateInterval')) || 5000,
    videoUrlInterno: localStorage.getItem('videoUrlInterno') || '',
    videoUrlEsterno: localStorage.getItem('videoUrlEsterno') || ''
};

// State
let isConnected = false;
let overrideActive = false;
let pendingCommand = null;
let updateTimer = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', init);

function init() {
    updateConnectionStatus(false);

    // Check if we're on dashboard
    if (document.getElementById('eventsList')) {
        initDashboard();
    }

    // Check if we're on settings
    if (document.getElementById('portaAutoEnabled')) {
        loadSettings();
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

function initDashboard() {
    // Setup video streams
    setupVideoStreams();

    // Start sensor polling
    startPolling();

    // Initial fetch
    fetchSensorData();
    fetchEvents();
}

function setupVideoStreams() {
    const videoInterno = document.getElementById('videoInterno');
    const videoEsterno = document.getElementById('videoEsterno');

    if (CONFIG.videoUrlInterno) {
        videoInterno.src = CONFIG.videoUrlInterno;
        videoInterno.style.display = 'block';
        videoInterno.nextElementSibling.style.display = 'none';
    }

    if (CONFIG.videoUrlEsterno) {
        videoEsterno.src = CONFIG.videoUrlEsterno;
        videoEsterno.style.display = 'block';
        videoEsterno.nextElementSibling.style.display = 'none';
    }
}

function startPolling() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    updateTimer = setInterval(() => {
        fetchSensorData();
    }, CONFIG.updateInterval);
}

async function fetchSensorData() {
    try {
        const response = await fetch(`${CONFIG.apiUrl}/sensors`);
        if (!response.ok) throw new Error('Network error');

        const data = await response.json();
        updateConnectionStatus(true);
        updateSensorDisplay(data);

    } catch (error) {
        console.error('Error fetching sensors:', error);
        updateConnectionStatus(false);
    }
}

function updateSensorDisplay(data) {
    // Update last update time
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleString('it-IT');
    }

    // Porta
    if (data.porta !== undefined) {
        const isOpen = data.porta.stato === 'aperta';
        const statusIndicator = document.getElementById('portaStatus');
        const statusText = document.getElementById('portaStatusText');
        const portaValue = document.getElementById('portaValue');

        statusIndicator.className = `status-indicator ${isOpen ? 'open' : 'closed'}`;
        statusText.textContent = isOpen ? 'Aperta' : 'Chiusa';
        portaValue.textContent = isOpen ? 'APERTA' : 'CHIUSA';

        if (data.porta.lastMove) {
            document.getElementById('portaLastMove').textContent =
                formatTimestamp(data.porta.lastMove);
        }
    }

    // Temperatura
    if (data.temperatura !== undefined) {
        document.getElementById('temperaturaValue').textContent =
            data.temperatura.valore.toFixed(1);

        if (data.temperatura.min !== undefined) {
            document.getElementById('tempMin').textContent = data.temperatura.min.toFixed(1);
        }
        if (data.temperatura.max !== undefined) {
            document.getElementById('tempMax').textContent = data.temperatura.max.toFixed(1);
        }
    }

    // Umidità
    if (data.umidita !== undefined) {
        document.getElementById('umiditaValue').textContent =
            Math.round(data.umidita.valore);

        const level = getHumidityLevel(data.umidita.valore);
        document.getElementById('umiditaLevel').textContent = level;
    }

    // Luminosità
    if (data.luminosita !== undefined) {
        document.getElementById('luminositaValue').textContent =
            Math.round(data.luminosita.valore);

        const status = getLightStatus(data.luminosita.valore);
        document.getElementById('luminositaStatus').textContent = status;
    }

    // Livello Acqua
    if (data.acqua !== undefined) {
        const acquaPercent = data.acqua.livello;
        document.getElementById('acquaValue').textContent = Math.round(acquaPercent);

        const acquaBar = document.getElementById('acquaBar');
        acquaBar.style.width = `${acquaPercent}%`;
        acquaBar.className = `level-bar-fill ${getLevelClass(acquaPercent)}`;

        const acquaStatus = document.getElementById('acquaStatus');
        const acquaStatusText = document.getElementById('acquaStatusText');
        updateLevelStatus(acquaStatus, acquaStatusText, acquaPercent);
    }

    // Livello Mangime
    if (data.mangime !== undefined) {
        const mangimePercent = data.mangime.livello;
        document.getElementById('mangimeValue').textContent = Math.round(mangimePercent);

        const mangimeBar = document.getElementById('mangimeBar');
        mangimeBar.style.width = `${mangimePercent}%`;
        mangimeBar.className = `level-bar-fill ${getLevelClass(mangimePercent)}`;

        const mangimeStatus = document.getElementById('mangimeStatus');
        const mangimeStatusText = document.getElementById('mangimeStatusText');
        updateLevelStatus(mangimeStatus, mangimeStatusText, mangimePercent);
    }

    // ESP32 Status
    if (data.esp32) {
        updateEspStatus('esp1', data.esp32.porta);
        updateEspStatus('esp2', data.esp32.ambiente);
    }
}

function updateEspStatus(id, espData) {
    if (!espData) return;

    const statusIndicator = document.getElementById(`${id}Status`);
    const statusText = document.getElementById(`${id}StatusText`);
    const heartbeat = document.getElementById(`${id}Heartbeat`);

    const isOnline = espData.online;
    statusIndicator.className = `status-indicator ${isOnline ? 'ok' : 'error'}`;
    statusText.textContent = isOnline ? 'Online' : 'Offline';

    if (espData.lastHeartbeat) {
        heartbeat.textContent = formatTimestamp(espData.lastHeartbeat);
    }
}

function updateLevelStatus(statusEl, textEl, percent) {
    const settings = loadSettingsFromStorage();
    const minLevel = 20; // Default or from settings

    if (percent <= minLevel) {
        statusEl.className = 'status-indicator error';
        textEl.textContent = 'BASSO';
    } else if (percent <= minLevel + 20) {
        statusEl.className = 'status-indicator warning';
        textEl.textContent = 'Attenzione';
    } else {
        statusEl.className = 'status-indicator ok';
        textEl.textContent = 'OK';
    }
}

async function fetchEvents() {
    try {
        const response = await fetch(`${CONFIG.apiUrl}/events?limit=10`);
        if (!response.ok) throw new Error('Network error');

        const events = await response.json();
        displayEvents(events);

    } catch (error) {
        console.error('Error fetching events:', error);
    }
}

function displayEvents(events) {
    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;

    if (!events || events.length === 0) {
        eventsList.innerHTML = `
            <div class="event-item">
                <span class="event-time">--</span>
                <span class="event-icon">--</span>
                <span class="event-message">Nessun evento registrato</span>
            </div>
        `;
        return;
    }

    eventsList.innerHTML = events.map(event => `
        <div class="event-item">
            <span class="event-time">${formatTimestamp(event.timestamp)}</span>
            <span class="event-icon">${getEventIcon(event.type)}</span>
            <span class="event-message">${event.message}</span>
        </div>
    `).join('');
}

// ============================================
// COMMAND FUNCTIONS
// ============================================

function confirmCommand(command, message) {
    pendingCommand = command;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.add('active');
}

function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
    pendingCommand = null;
}

async function executeCommand() {
    if (!pendingCommand) return;

    const command = pendingCommand;
    closeModal();

    try {
        const response = await fetch(`${CONFIG.apiUrl}/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: command })
        });

        if (!response.ok) throw new Error('Command failed');

        const result = await response.json();
        showToast('Comando eseguito con successo', 'success');

        // Refresh data
        setTimeout(fetchSensorData, 1000);
        setTimeout(fetchEvents, 1000);

    } catch (error) {
        console.error('Error executing command:', error);
        showToast('Errore nell\'esecuzione del comando', 'error');
    }
}

function toggleOverride() {
    overrideActive = !overrideActive;
    const btn = document.getElementById('btnOverride');

    if (overrideActive) {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-danger');
        btn.textContent = 'Disattiva Override';
        showToast('Override attivato - automatismi disabilitati', 'warning');
    } else {
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-outline');
        btn.textContent = 'Attiva Override';
        showToast('Override disattivato - automatismi ripristinati', 'info');
    }

    // Send override state to backend
    fetch(`${CONFIG.apiUrl}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: overrideActive })
    }).catch(err => console.error('Error setting override:', err));
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

function loadSettings() {
    const settings = loadSettingsFromStorage();

    // Porta
    setChecked('portaAutoEnabled', settings.portaAutoEnabled);
    setValue('portaOrarioMode', settings.portaOrarioMode);
    setValue('portaOraApertura', settings.portaOraApertura);
    setValue('portaOraChiusura', settings.portaOraChiusura);
    setValue('portaLuxApertura', settings.portaLuxApertura);
    setValue('portaLuxChiusura', settings.portaLuxChiusura);
    setValue('portaRitardoApertura', settings.portaRitardoApertura);
    setValue('portaRitardoChiusura', settings.portaRitardoChiusura);

    // Soglie
    setValue('tempMin', settings.tempMin);
    setValue('tempMax', settings.tempMax);
    setValue('umidMin', settings.umidMin);
    setValue('umidMax', settings.umidMax);
    setValue('acquaMin', settings.acquaMin);
    setValue('mangimeMin', settings.mangimeMin);

    // Ventilazione
    setChecked('ventAutoEnabled', settings.ventAutoEnabled);
    setValue('ventTempOn', settings.ventTempOn);
    setValue('ventTempOff', settings.ventTempOff);
    setValue('ventUmidOn', settings.ventUmidOn);

    // Illuminazione
    setChecked('luceAutoEnabled', settings.luceAutoEnabled);
    setValue('luceDurata', settings.luceDurata);
    setValue('luceIntensita', settings.luceIntensita);

    // Video
    setValue('videoUrlInterno', settings.videoUrlInterno);
    setValue('videoUrlEsterno', settings.videoUrlEsterno);

    // Sistema
    setValue('updateInterval', settings.updateInterval / 1000);
    setValue('heartbeatTimeout', settings.heartbeatTimeout);
    setValue('geoLat', settings.geoLat);
    setValue('geoLon', settings.geoLon);
    setValue('apiUrl', settings.apiUrl);

    // Notifiche
    setChecked('notifBrowserEnabled', settings.notifBrowserEnabled);
    setChecked('notifTelegramEnabled', settings.notifTelegramEnabled);
    setValue('telegramToken', settings.telegramToken);
    setValue('telegramChatId', settings.telegramChatId);
    setChecked('notifAllarmi', settings.notifAllarmi);
    setChecked('notifPorta', settings.notifPorta);
    setChecked('notifEsp', settings.notifEsp);
    setChecked('notifManutenzione', settings.notifManutenzione);

    // Trigger visibility updates
    const modeSelect = document.getElementById('portaOrarioMode');
    if (modeSelect) {
        modeSelect.dispatchEvent(new Event('change'));
    }

    const telegramCheck = document.getElementById('notifTelegramEnabled');
    if (telegramCheck) {
        telegramCheck.dispatchEvent(new Event('change'));
    }
}

function loadSettingsFromStorage() {
    const defaults = {
        // Porta
        portaAutoEnabled: true,
        portaOrarioMode: 'alba_tramonto',
        portaOraApertura: '06:30',
        portaOraChiusura: '20:00',
        portaLuxApertura: 100,
        portaLuxChiusura: 50,
        portaRitardoApertura: 0,
        portaRitardoChiusura: 30,

        // Soglie
        tempMin: 5,
        tempMax: 35,
        umidMin: 30,
        umidMax: 80,
        acquaMin: 20,
        mangimeMin: 20,

        // Ventilazione
        ventAutoEnabled: true,
        ventTempOn: 28,
        ventTempOff: 25,
        ventUmidOn: 75,

        // Illuminazione
        luceAutoEnabled: false,
        luceDurata: 15,
        luceIntensita: 80,

        // Video
        videoUrlInterno: '',
        videoUrlEsterno: '',

        // Sistema
        updateInterval: 5000,
        heartbeatTimeout: 120,
        geoLat: 43.7,
        geoLon: 12.9,
        apiUrl: 'http://localhost:5000/api',

        // Notifiche
        notifBrowserEnabled: true,
        notifTelegramEnabled: false,
        telegramToken: '',
        telegramChatId: '',
        notifAllarmi: true,
        notifPorta: true,
        notifEsp: true,
        notifManutenzione: false
    };

    try {
        const saved = localStorage.getItem('pollaiSettings');
        if (saved) {
            return { ...defaults, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }

    return defaults;
}

function saveSettings() {
    const settings = {
        // Porta
        portaAutoEnabled: getChecked('portaAutoEnabled'),
        portaOrarioMode: getValue('portaOrarioMode'),
        portaOraApertura: getValue('portaOraApertura'),
        portaOraChiusura: getValue('portaOraChiusura'),
        portaLuxApertura: parseInt(getValue('portaLuxApertura')),
        portaLuxChiusura: parseInt(getValue('portaLuxChiusura')),
        portaRitardoApertura: parseInt(getValue('portaRitardoApertura')),
        portaRitardoChiusura: parseInt(getValue('portaRitardoChiusura')),

        // Soglie
        tempMin: parseFloat(getValue('tempMin')),
        tempMax: parseFloat(getValue('tempMax')),
        umidMin: parseInt(getValue('umidMin')),
        umidMax: parseInt(getValue('umidMax')),
        acquaMin: parseInt(getValue('acquaMin')),
        mangimeMin: parseInt(getValue('mangimeMin')),

        // Ventilazione
        ventAutoEnabled: getChecked('ventAutoEnabled'),
        ventTempOn: parseFloat(getValue('ventTempOn')),
        ventTempOff: parseFloat(getValue('ventTempOff')),
        ventUmidOn: parseInt(getValue('ventUmidOn')),

        // Illuminazione
        luceAutoEnabled: getChecked('luceAutoEnabled'),
        luceDurata: parseInt(getValue('luceDurata')),
        luceIntensita: parseInt(getValue('luceIntensita')),

        // Video
        videoUrlInterno: getValue('videoUrlInterno'),
        videoUrlEsterno: getValue('videoUrlEsterno'),

        // Sistema
        updateInterval: parseInt(getValue('updateInterval')) * 1000,
        heartbeatTimeout: parseInt(getValue('heartbeatTimeout')),
        geoLat: parseFloat(getValue('geoLat')),
        geoLon: parseFloat(getValue('geoLon')),
        apiUrl: getValue('apiUrl'),

        // Notifiche
        notifBrowserEnabled: getChecked('notifBrowserEnabled'),
        notifTelegramEnabled: getChecked('notifTelegramEnabled'),
        telegramToken: getValue('telegramToken'),
        telegramChatId: getValue('telegramChatId'),
        notifAllarmi: getChecked('notifAllarmi'),
        notifPorta: getChecked('notifPorta'),
        notifEsp: getChecked('notifEsp'),
        notifManutenzione: getChecked('notifManutenzione')
    };

    // Save to localStorage
    localStorage.setItem('pollaiSettings', JSON.stringify(settings));

    // Update CONFIG
    CONFIG.apiUrl = settings.apiUrl;
    CONFIG.updateInterval = settings.updateInterval;
    CONFIG.videoUrlInterno = settings.videoUrlInterno;
    CONFIG.videoUrlEsterno = settings.videoUrlEsterno;

    // Also save key values individually for easy access
    localStorage.setItem('apiUrl', settings.apiUrl);
    localStorage.setItem('updateInterval', settings.updateInterval.toString());
    localStorage.setItem('videoUrlInterno', settings.videoUrlInterno);
    localStorage.setItem('videoUrlEsterno', settings.videoUrlEsterno);

    // Send settings to backend
    fetch(`${CONFIG.apiUrl}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    }).then(response => {
        if (response.ok) {
            showToast('Impostazioni salvate e inviate al server', 'success');
        } else {
            showToast('Impostazioni salvate localmente (server non raggiungibile)', 'warning');
        }
    }).catch(error => {
        console.error('Error saving to server:', error);
        showToast('Impostazioni salvate localmente (server non raggiungibile)', 'warning');
    });
}

function resetSettings() {
    if (confirm('Sei sicuro di voler ripristinare le impostazioni predefinite?')) {
        localStorage.removeItem('pollaiSettings');
        localStorage.removeItem('apiUrl');
        localStorage.removeItem('updateInterval');
        localStorage.removeItem('videoUrlInterno');
        localStorage.removeItem('videoUrlEsterno');
        loadSettings();
        showToast('Impostazioni ripristinate ai valori predefiniti', 'info');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateConnectionStatus(connected) {
    isConnected = connected;
    const dot = document.getElementById('connectionDot');
    const text = document.getElementById('connectionText');

    if (dot && text) {
        dot.classList.toggle('connected', connected);
        text.textContent = connected ? 'Connesso' : 'Disconnesso';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getHumidityLevel(value) {
    if (value < 30) return 'Troppo bassa';
    if (value > 80) return 'Troppo alta';
    if (value > 70) return 'Alta';
    if (value < 40) return 'Bassa';
    return 'Ottimale';
}

function getLightStatus(lux) {
    if (lux < 10) return 'Notte';
    if (lux < 100) return 'Crepuscolo';
    if (lux < 1000) return 'Nuvoloso';
    if (lux < 10000) return 'Sereno';
    return 'Sole pieno';
}

function getLevelClass(percent) {
    if (percent <= 20) return 'danger';
    if (percent <= 40) return 'warning';
    return 'ok';
}

function getEventIcon(type) {
    const icons = {
        'porta_aperta': '🚪',
        'porta_chiusa': '🔒',
        'allarme_temp': '🌡️',
        'allarme_acqua': '💧',
        'allarme_mangime': '🌾',
        'esp_online': '✅',
        'esp_offline': '❌',
        'override': '⚙️',
        'luce_on': '💡',
        'luce_off': '🌙',
        'ventola_on': '🌀',
        'ventola_off': '⭕'
    };
    return icons[type] || 'ℹ️';
}

// Form helpers
function getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined) {
        el.value = value;
    }
}

function getChecked(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function setChecked(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.checked = !!value;
    }
}

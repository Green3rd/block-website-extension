// options.js

const domainInput = document.getElementById('domainInput');
const pathInput = document.getElementById('pathInput');
const addBtn = document.getElementById('addBtn');
const blockedList = document.getElementById('blockedList');

// Load blocked sites on startup
document.addEventListener('DOMContentLoaded', loadBlockedSites);

addBtn.addEventListener('click', async () => {
    let domain = domainInput.value.trim().toLowerCase();
    let path = pathInput.value.trim();

    if (!domain) return;

    // Remove protocol if present
    domain = domain.replace(/^(https?:\/\/)/, '');
    // Remove trailing slashes from domain
    domain = domain.replace(/\/$/, '');

    const site = {
        domain: domain,
        path: path || ''
    };

    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    
    // Check for duplicates
    const isDuplicate = blockedSites.some(s => s.domain === site.domain && s.path === site.path);
    if (isDuplicate) {
        alert('This rule already exists!');
        return;
    }

    const newList = [...blockedSites, site];
    await chrome.storage.sync.set({ blockedSites: newList });

    domainInput.value = '';
    pathInput.value = '';
    renderList(newList);
});

async function loadBlockedSites() {
    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    renderList(blockedSites);
}

function renderList(sites) {
    if (sites.length === 0) {
        blockedList.innerHTML = '<div class="empty-state">No redirect rules yet.</div>';
        return;
    }

    blockedList.innerHTML = '';
    sites.forEach((site, index) => {
        const item = document.createElement('div');
        item.className = 'blocked-item';
        
        item.innerHTML = `
            <div class="item-info">
                <span class="item-domain">${site.domain}</span>
                ${site.path ? `<span class="item-path">${site.path}</span>` : '<span class="item-path">Entire site</span>'}
            </div>
            <button class="delete-btn" data-index="${index}">×</button>
        `;
        
        blockedList.appendChild(item);
    });

    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteSite);
    });
}

async function deleteSite(e) {
    const index = parseInt(e.target.getAttribute('data-index'));
    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    
    const newList = blockedSites.filter((_, i) => i !== index);
    await chrome.storage.sync.set({ blockedSites: newList });
    renderList(newList);
}

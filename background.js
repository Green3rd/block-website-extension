// background.js

async function updateRules() {
  console.log('Starting rule update...');
  try {
    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    
    // 1. Get ALL current dynamic rules to ensure we clear everything properly
    const currentRules = await chrome.declarativeNetRequest.getDynamicRules();
    const currentRuleIds = currentRules.map(rule => rule.id);
    console.log('Clearing existing rule IDs:', currentRuleIds);

    // 2. Clear old rules first
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: currentRuleIds
    });

    // 3. Create new rules with unique IDs
    // We use a counter to ensure uniqueness even if the filter step changes the array length
    let ruleCounter = 1;
    const newRules = blockedSites
      .filter(site => site && site.domain && typeof site.domain === 'string' && !site.domain.includes('shhhnoise.com'))
      .map((site) => {
        // Clean up domain
        let domain = site.domain.toLowerCase()
          .trim()
          .replace(/^(https?:\/\/)/, '')
          .replace(/\/$/, '')
          .replace(/^(\*\.)/, '');
        
        if (!domain) return null;

        const cleanPath = site.path && typeof site.path === 'string' ? 
          (site.path.startsWith('/') ? site.path : '/' + site.path) : '';
        
        const urlFilter = cleanPath ? `||${domain}${cleanPath}` : `||${domain}^`;

        const rule = {
          id: ruleCounter++, // Increment unique ID
          priority: 1,
          action: { 
            type: 'redirect',
            redirect: { url: 'https://www.shhhnoise.com/' }
          },
          condition: {
            urlFilter: urlFilter,
            resourceTypes: ['main_frame']
          }
        };
        return rule;
      })
      .filter(rule => rule !== null);

    console.log('Final validated rules to add:', JSON.stringify(newRules, null, 2));

    // 4. Add the new rules
    if (newRules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: newRules
      });
    }
    
    console.log('Successfully updated focus rules.');
  } catch (error) {
    console.error('CRITICAL: Failed to update focus rules:', error);
    if (error.stack) console.error(error.stack);
  }
}

// Update rules when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.blockedSites) {
    updateRules();
  }
});

// Update rules on startup
chrome.runtime.onInstalled.addListener(async (details) => {
  const { blockedSites } = await chrome.storage.sync.get('blockedSites');
  
  // Seed default site if storage is completely empty (new install or development)
  if (!blockedSites || blockedSites.length === 0) {
    const defaultSites = [
      { domain: 'instagram.com', path: '/explore' }
    ];
    await chrome.storage.sync.set({ blockedSites: defaultSites });
    console.log('Seeded default blocked sites.');
  }
  
  updateRules();
});
chrome.runtime.onStartup.addListener(updateRules);

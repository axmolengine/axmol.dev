(() => {
  const button = document.getElementById('hub-primary-download');
  const downloads = Array.from(document.querySelectorAll('[data-hub-target]'));

  if (!button || downloads.length === 0) {
    return;
  }

  const normalizeArchitecture = (architecture, bitness) => {
    const value = (architecture || '').toLowerCase();
    if (value.includes('arm') || value.includes('aarch64')) {
      return 'arm64';
    }
    if (value.includes('x86_64') || value.includes('x86-64') || value.includes('amd64') || (value === 'x86' && bitness === '64')) {
      return 'x64';
    }
    return '';
  };

  const getDownloadTarget = (platform, userAgent, architecture, bitness) => {
    const platformText = `${platform} ${userAgent}`.toLowerCase();
    const arch = normalizeArchitecture(architecture, bitness);

    if (platformText.includes('windows nt') || platformText.includes('windows')) {
      const is64Bit = arch === 'x64' || /win64|x64|wow64|amd64/i.test(userAgent);
      return is64Bit ? 'windows-x64' : '';
    }
    if (platformText.includes('mac') || platformText.includes('os x')) {
      if (arch === 'arm64') {
        return 'macos-arm64';
      }
      if (arch === 'x64') {
        return 'macos-x64';
      }
      return '';
    }
    if (platformText.includes('linux') || platformText.includes('x11')) {
      const is64Bit = arch === 'x64' || /x86_64|x64|amd64/i.test(`${platform} ${userAgent}`);
      return is64Bit ? 'linux-x64' : '';
    }
    return '';
  };

  const configurePrimaryButton = (target) => {
    const download = downloads.find((item) => item.dataset.hubTarget === target);
    if (!download) {
      return;
    }

    button.textContent = download.dataset.downloadLabel;
    button.disabled = false;
    button.addEventListener('click', () => window.location.assign(download.href));
  };

  const detectAndConfigure = async () => {
    const userAgentData = navigator.userAgentData;
    let architecture = '';
    let bitness = '';

    if (userAgentData && typeof userAgentData.getHighEntropyValues === 'function') {
      try {
        const hints = await userAgentData.getHighEntropyValues(['architecture', 'bitness']);
        architecture = hints.architecture || '';
        bitness = hints.bitness || '';
      } catch (error) {
        console.warn('Axmol Hub platform detection was unavailable; choose a download from the menu.', error);
      }
    }

    const target = getDownloadTarget(
      userAgentData?.platform || navigator.platform || '',
      navigator.userAgent,
      architecture,
      bitness
    );
    configurePrimaryButton(target);
  };

  detectAndConfigure();
})();

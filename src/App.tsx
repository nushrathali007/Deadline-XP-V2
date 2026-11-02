import React, { useState, useEffect, useRef } from 'react';

type WallpaperId = 'bliss' | 'luna' | 'teal' | 'autumn';
type AccountMode = 'hospital' | 'cash' | 'outbreak';

interface WinInstance {
  id: string;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
}

interface AccountConfig {
  mode: AccountMode;
  gameId: 'ward' | 'cash' | 'outbreak';
  gameTitle: string;
  gameShortTitle: string;
  gameSub: string;
  gameIcon: string;
  windowTitle: string;
  accountLabel: string;
  watermarkSub: string;
  notesFilename: string;
  defaultNotes: string;
  driveLabel: string;
  driveSub: string;
  helpTitle: string;
  helpIntro: string;
  helpBullets: string[];
}

const ACCOUNT_CONFIGS: Record<AccountMode, AccountConfig> = {
  hospital: {
    mode: 'hospital',
    gameId: 'ward',
    gameTitle: 'Ward Rounds (3D Hospital)',
    gameShortTitle: 'Ward Rounds 3D',
    gameSub: 'Minecraft Hospital',
    gameIcon: '/assets/hospital-xp.svg',
    windowTitle: 'Ward Rounds — 3D Minecraft Hospital',
    accountLabel: 'Hospital Ward · Ward Rounds 3D',
    watermarkSub: 'Hospital Ward · 3D Minecraft Voxel Hospital',
    notesFilename: 'Shift Notes.txt',
    defaultNotes:
      `=== WARD ROUNDS GENERAL HOSPITAL — SHIFT NOTES ===\n` +
      `Attending Physician: Dr. Player\n` +
      `Destination: Floor 7 · Room 07\n\n` +
      `1. Read the clinical case & meme clues on the left.\n` +
      `2. Submit your diagnosis or drug answer (7 guesses max).\n` +
      `3. Watch the Minecraft elevator & specialty wards on Floors 1–6.\n` +
      `4. Toggle between Lift, Tower, Patient Room, and Hospital views!\n`,
    driveLabel: 'Minecraft Ward (D:)',
    driveSub: '7-Floor 3D Voxel Hospital · Active',
    helpTitle: 'Hospital Ward — How to Play Ward Rounds 3D',
    helpIntro:
      'Welcome to your Hospital Ward desktop. Double-click Ward Rounds (3D Hospital) on the desktop or select it from the Start menu to launch the game.',
    helpBullets: [
      'Choose the Daily Case or open the Practice Ward to browse clinical cases.',
      'Read the clinical scenario and visual clues, then submit your diagnosis or medication answer.',
      'You have 7 guesses. Correct answers send the Chief Doctor up to Floor 7 to recover the patient; wrong guesses stop at specialty wards along the way.',
      'Switch freely between Lift View, Tower View, Patient Room, and Full 3D Hospital View.',
    ],
  },
  cash: {
    mode: 'cash',
    gameId: 'cash',
    gameTitle: 'The Missing Cash',
    gameShortTitle: 'The Missing Cash',
    gameSub: 'Register Investigation',
    gameIcon: '/assets/user.png',
    windowTitle: 'The Missing Cash — Front Register Investigation',
    accountLabel: 'Meridian House · The Missing Cash',
    watermarkSub: 'Meridian House · Front Register Investigation',
    notesFilename: 'Case Notes.txt',
    defaultNotes:
      `=== MERIDIAN HOUSE — FRONT TILL INVESTIGATION NOTES ===\n` +
      `Investigator: Duty Support\n` +
      `Workstation: SUPPORT-01 / Front Till PC-04\n\n` +
      `1. Isolate the affected reception workstation (PC-04).\n` +
      `2. Reconcile the opening float (£300), cash sales (£410), and approved refund (-£90) against the £380 physical drawer count.\n` +
      `3. Verify whether refund R-119 (£240) was genuine using customer mail and card receipts.\n` +
      `4. Identify who physically received the cash envelope using the signed handover slip.\n`,
    driveLabel: 'Incident Copies (D:)',
    driveSub: 'Preserved Till & Operations Records · Read-Only',
    helpTitle: 'The Missing Cash — Investigation Guide',
    helpIntro:
      'Welcome to your Meridian House support desktop. Double-click The Missing Cash on the desktop or select it from the Start menu to open the investigation.',
    helpBullets: [
      'Start with the First Step Guide to isolate the affected reception workstation (PC-04).',
      'Inspect Till Records, Operations Mail, and Reception Screenshots to trace the missing £240.',
      'Attach inspected evidence records to support each finding—reading and testing hypotheses cost no incident time.',
      'File your final case conclusion once you have reconciled the cash, refund, and physical handover.',
    ],
  },
  outbreak: {
    mode: 'outbreak',
    gameId: 'outbreak',
    gameTitle: 'Virus Outbreak',
    gameShortTitle: 'Virus Outbreak',
    gameSub: 'System Containment',
    gameIcon: '/assets/icon-48.ico',
    windowTitle: 'Virus Outbreak — System Containment & Recovery',
    accountLabel: 'Reception PC · Virus Outbreak',
    watermarkSub: 'Virus Outbreak · 15-Challenge Desktop Recovery',
    notesFilename: 'Recovery Notes.txt',
    defaultNotes:
      `=== RECEPTION PC — VIRUS OUTBREAK RECOVERY CHECKLIST ===\n` +
      `Source Package: RAM_Doubler_Setup.exe (Unknown Publisher)\n\n` +
      `1. Resolve pop-up windows to keep memory below 100% and earn recovery credits.\n` +
      `2. Buy upgrades (Intern, Antivirus Assistant, More RAM, Ergonomic Mouse).\n` +
      `3. Task 1: Resolve 24 windows, then end ramdoubler.exe in Task Manager.\n` +
      `4. Task 2: Quarantine RAM_Doubler_Setup.exe in Security Center.\n` +
      `5. Task 3: Disable RAM Doubler Helper in Startup Configuration.\n` +
      `6. Task 4: Complete the 20-second repair scan and Restart Now.\n`,
    driveLabel: 'Recovery Tools (D:)',
    driveSub: 'Security Center, Task Manager & Upgrades',
    helpTitle: 'Virus Outbreak — Containment & Recovery Guide',
    helpIntro:
      'Welcome to the Reception PC desktop. Double-click Virus Outbreak on the desktop or select it from the Start menu to begin the containment simulation.',
    helpBullets: [
      'Open RAM Doubler Setup inside the simulation to trigger the outbreak tutorial.',
      'Handle 15 distinct window types: close ordinary errors, cancel rogue installers, reject fake antivirus prompts, verify security codes, and end frozen tasks in Task Manager.',
      'Spend earned credits on Upgrades (Interns, Antivirus, RAM) that persist even if memory hits 100%.',
      'Complete all 4 recovery tasks in Security Center to disinfect and restart the computer.',
    ],
  },
};

export default function App() {
  const [profile, setProfile] = useState<string>(() => {
    try {
      return localStorage.getItem('deadline-user') || 'Dr. Player';
    } catch {
      return 'Dr. Player';
    }
  });
  const [accountMode, setAccountMode] = useState<AccountMode>('hospital');
  const [showLogin, setShowLogin] = useState<boolean>(true);
  const [wallpaper, setWallpaper] = useState<WallpaperId>('bliss');
  const [selectedIcon, setSelectedIcon] = useState<string | null>('ward');
  const [startOpen, setStartOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(65);
  const [showVolumePopup, setShowVolumePopup] = useState<boolean>(false);
  const [clockText, setClockText] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [runInput, setRunInput] = useState<string>('ward');
  const [notepadText, setNotepadText] = useState<string>(ACCOUNT_CONFIGS.hospital.defaultNotes);

  const [topZ, setTopZ] = useState<number>(30);
  const [windows, setWindows] = useState<WinInstance[]>([]);

  const activeAccount = ACCOUNT_CONFIGS[accountMode];

  const desktopShortcuts = [
    {
      id: activeAccount.gameId,
      title: activeAccount.gameTitle,
      icon: activeAccount.gameIcon,
    },
    { id: 'documents', title: 'My Documents', icon: '/assets/folder.png' },
    { id: 'computer', title: 'My Computer', icon: '/assets/icon-16.ico' },
    { id: 'control', title: 'Control Panel', icon: '/assets/icon-36.ico' },
    { id: 'help', title: 'How to Play', icon: '/assets/icon-24.ico' },
  ];

  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const playXpSound = (name: 'start' | 'logon' | 'logoff' | 'error' | 'notify' | 'ding') => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio(`/assets/audio/${name}.wav`);
      audio.volume = Math.max(0, Math.min(1, volume / 100));
      audio.play().catch(() => {});
    } catch {}
  };

  useEffect(() => {
    const updateClock = () => {
      setClockText(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'xp-embedded-logout') {
        setWindows([]);
        setShowLogin(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const { id, startX, startY, origX, origY } = dragRef.current;
      const nx = Math.max(0, Math.min(window.innerWidth - 180, origX + (e.clientX - startX)));
      const ny = Math.max(0, Math.min(window.innerHeight - 72, origY + (e.clientY - startY)));
      setWindows(prev =>
        prev.map(w => (w.id === id ? { ...w, x: nx, y: ny, maximized: false } : w))
      );
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const focusWindow = (id: string) => {
    setTopZ(z => {
      const nextZ = z + 1;
      setWindows(prev =>
        prev.map(w => (w.id === id ? { ...w, zIndex: nextZ, minimized: false } : w))
      );
      return nextZ;
    });
  };

  const openWindow = (id: string) => {
    // Prevent opening another account's game inside the current account's desktop
    const resolvedId =
      id === 'ward' || id === 'cash' || id === 'outbreak' || id === 'deadline'
        ? activeAccount.gameId
        : id;

    setStartOpen(false);
    setContextMenu(null);
    playXpSound('start');

    const existing = windows.find(w => w.id === resolvedId);
    if (existing) {
      focusWindow(resolvedId);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nextZ = topZ + 1;
    setTopZ(nextZ);

    const presets: Record<string, Omit<WinInstance, 'id' | 'zIndex'>> = {
      ward: {
        title: ACCOUNT_CONFIGS.hospital.windowTitle,
        icon: ACCOUNT_CONFIGS.hospital.gameIcon,
        x: Math.max(110, Math.round((vw - Math.min(1180, vw - 125)) / 2)),
        y: 14,
        width: Math.min(1180, vw - 125),
        height: Math.min(720, vh - 64),
        minimized: false,
        maximized: false,
      },
      cash: {
        title: ACCOUNT_CONFIGS.cash.windowTitle,
        icon: ACCOUNT_CONFIGS.cash.gameIcon,
        x: Math.max(95, Math.round((vw - Math.min(1120, vw - 110)) / 2)),
        y: 20,
        width: Math.min(1120, vw - 110),
        height: Math.min(700, vh - 68),
        minimized: false,
        maximized: false,
      },
      outbreak: {
        title: ACCOUNT_CONFIGS.outbreak.windowTitle,
        icon: ACCOUNT_CONFIGS.outbreak.gameIcon,
        x: Math.max(95, Math.round((vw - Math.min(1120, vw - 110)) / 2)),
        y: 20,
        width: Math.min(1120, vw - 110),
        height: Math.min(700, vh - 68),
        minimized: false,
        maximized: false,
      },
      documents: {
        title: `My Documents — ${activeAccount.gameShortTitle}`,
        icon: '/assets/folder.png',
        x: Math.max(80, Math.round(vw * 0.22)),
        y: 68,
        width: Math.min(640, vw - 40),
        height: 420,
        minimized: false,
        maximized: false,
      },
      computer: {
        title: 'My Computer',
        icon: '/assets/icon-16.ico',
        x: Math.max(100, Math.round(vw * 0.25)),
        y: 84,
        width: Math.min(620, vw - 40),
        height: 420,
        minimized: false,
        maximized: false,
      },
      control: {
        title: 'Control Panel — Display & Audio Properties',
        icon: '/assets/icon-36.ico',
        x: Math.max(120, Math.round(vw * 0.28)),
        y: 76,
        width: Math.min(540, vw - 40),
        height: 440,
        minimized: false,
        maximized: false,
      },
      notepad: {
        title: `${activeAccount.notesFilename} - Notepad`,
        icon: '/assets/icon-24.ico',
        x: Math.max(140, Math.round(vw * 0.3)),
        y: 92,
        width: Math.min(520, vw - 40),
        height: 380,
        minimized: false,
        maximized: false,
      },
      help: {
        title: activeAccount.helpTitle,
        icon: '/assets/icon-24.ico',
        x: Math.max(130, Math.round(vw * 0.26)),
        y: 70,
        width: Math.min(600, vw - 40),
        height: 440,
        minimized: false,
        maximized: false,
      },
      run: {
        title: 'Run',
        icon: '/assets/icon-24.ico',
        x: Math.max(40, Math.min(180, vw - 400)),
        y: Math.max(80, vh - 260),
        width: 370,
        height: 200,
        minimized: false,
        maximized: false,
      },
      shutdown: {
        title: 'Turn off computer',
        icon: '/assets/windows-off.png',
        x: Math.max(40, Math.round((vw - 380) / 2)),
        y: Math.max(80, Math.round((vh - 230) / 2)),
        width: 380,
        height: 215,
        minimized: false,
        maximized: false,
      },
    };

    const config = presets[resolvedId] || presets[activeAccount.gameId];
    setWindows(prev => [...prev, { id: resolvedId, ...config, zIndex: nextZ }]);
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  };

  const toggleMinimize = (id: string) => {
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, minimized: !w.minimized } : w))
    );
  };

  const toggleMaximize = (id: string) => {
    focusWindow(id);
    setWindows(prev =>
      prev.map(w => (w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w))
    );
  };

  const handleTaskClick = (win: WinInstance) => {
    const isTop =
      !win.minimized &&
      win.zIndex === Math.max(...windows.filter(w => !w.minimized).map(w => w.zIndex), 0);
    if (win.minimized) {
      focusWindow(win.id);
    } else if (isTop) {
      toggleMinimize(win.id);
    } else {
      focusWindow(win.id);
    }
  };

  const handleRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = runInput.trim().toLowerCase();
    closeWindow('run');
    if (
      cmd.includes('ward') ||
      cmd.includes('hospital') ||
      cmd.includes('cash') ||
      cmd.includes('outbreak') ||
      cmd.includes('game')
    ) {
      openWindow(activeAccount.gameId);
    } else if (cmd.includes('note')) openWindow('notepad');
    else if (cmd.includes('control') || cmd.includes('display')) openWindow('control');
    else if (cmd.includes('doc') || cmd.includes('explorer')) openWindow('documents');
    else if (cmd.includes('comp')) openWindow('computer');
    else {
      playXpSound('error');
      openWindow('help');
    }
  };

  const handleLoginAccount = (mode: AccountMode) => {
    const cfg = ACCOUNT_CONFIGS[mode];
    setAccountMode(mode);
    setShowLogin(false);
    setWindows([]);
    setSelectedIcon(cfg.gameId);
    setRunInput(cfg.gameId);
    setNotepadText(cfg.defaultNotes);
    try {
      localStorage.setItem('deadline-user', profile.trim() || 'Dr. Player');
    } catch {}
    playXpSound('logon');
  };

  const activeTopId = windows
    .filter(w => !w.minimized)
    .reduce<WinInstance | null>((best, w) => (!best || w.zIndex > best.zIndex ? w : best), null)?.id;

  // The Missing Cash and Virus Outbreak unfold natively as the entire Windows XP desktop session upon login
  if (!showLogin && (accountMode === 'cash' || accountMode === 'outbreak')) {
    const safeUser = profile.trim() || 'Dr. Player';
    return (
      <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden', background: '#3a6ea5' }}>
        <iframe
          key={`${accountMode}-${safeUser}`}
          title={
            accountMode === 'cash'
              ? 'Windows XP — Meridian House Duty Support (The Missing Cash)'
              : 'Windows XP — Reception PC (Virus Outbreak)'
          }
          src={`/classic-xp.html?mode=${accountMode}&user=${encodeURIComponent(safeUser)}&v=3`}
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          allow="autoplay; fullscreen"
        />
      </div>
    );
  }

  return (
    <div
      className={`xp-desktop wallpaper-${wallpaper}`}
      onPointerDown={e => {
        if ((e.target as HTMLElement).classList.contains('xp-desktop')) {
          setSelectedIcon(null);
          setStartOpen(false);
          setContextMenu(null);
          setShowVolumePopup(false);
        }
      }}
      onContextMenu={e => {
        if ((e.target as HTMLElement).classList.contains('xp-desktop')) {
          e.preventDefault();
          setStartOpen(false);
          setContextMenu({
            x: Math.min(e.clientX, window.innerWidth - 190),
            y: Math.min(e.clientY, window.innerHeight - 180),
          });
        }
      }}
    >
      {/* Desktop Shortcut Icons (Strictly for the Logged-In Account) */}
      <div className="xp-desktop-icons" role="region" aria-label="Desktop Shortcuts">
        {desktopShortcuts.map(item => (
          <button
            key={item.id}
            type="button"
            className={`xp-shortcut ${selectedIcon === item.id ? 'selected' : ''}`}
            onClick={e => {
              e.stopPropagation();
              if (selectedIcon === item.id) {
                openWindow(item.id);
              } else {
                setSelectedIcon(item.id);
              }
              setStartOpen(false);
              setContextMenu(null);
            }}
            onDoubleClick={e => {
              e.stopPropagation();
              openWindow(item.id);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                openWindow(item.id);
              }
            }}
            title="Click or double-click to open"
          >
            <span className="xp-shortcut-icon">
              <img src={item.icon} alt="" />
            </span>
            <span>{item.title}</span>
          </button>
        ))}
      </div>

      {/* Desktop Watermark (Strictly for the Logged-In Account) */}
      <div className="xp-desktop-watermark">
        <small>WINDOWS XP PROFESSIONAL</small>
        <h1>DEADLINE XP</h1>
        <p>{activeAccount.watermarkSub}</p>
      </div>

      {/* Open Windows XP Windows */}
      {windows.map(win => {
        if (win.minimized) return null;
        const isFocused = activeTopId === win.id;
        return (
          <section
            key={win.id}
            className={`xp-window ${isFocused ? '' : 'inactive'} ${win.maximized ? 'maximized' : ''}`}
            style={{
              left: `${win.x}px`,
              top: `${win.y}px`,
              width: `${win.width}px`,
              height: `${win.height}px`,
              zIndex: win.zIndex,
            }}
            onPointerDown={() => {
              if (!isFocused) focusWindow(win.id);
              setStartOpen(false);
              setContextMenu(null);
            }}
            aria-label={win.title}
          >
            {/* Titlebar */}
            <div
              className="xp-titlebar"
              onDoubleClick={() => toggleMaximize(win.id)}
              onPointerDown={e => {
                if ((e.target as HTMLElement).closest('.xp-window-controls')) return;
                focusWindow(win.id);
                if (win.maximized) return;
                dragRef.current = {
                  id: win.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: win.x,
                  origY: win.y,
                };
              }}
            >
              <img className="xp-titlebar-icon" src={win.icon} alt="" />
              <span className="xp-titlebar-caption">{win.title}</span>
              <div className="xp-window-controls">
                <button
                  type="button"
                  className="xp-win-btn"
                  title="Minimize"
                  aria-label="Minimize"
                  onClick={() => toggleMinimize(win.id)}
                >
                  _
                </button>
                <button
                  type="button"
                  className="xp-win-btn"
                  title={win.maximized ? 'Restore' : 'Maximize'}
                  aria-label={win.maximized ? 'Restore' : 'Maximize'}
                  onClick={() => toggleMaximize(win.id)}
                >
                  □
                </button>
                <button
                  type="button"
                  className="xp-win-btn close"
                  title="Close"
                  aria-label="Close"
                  onClick={() => closeWindow(win.id)}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Hospital Ward Game Window */}
            {win.id === 'ward' && accountMode === 'hospital' && (
              <>
                <div className="xp-window-body">
                  <iframe
                    title="Ward Rounds 3D Minecraft Hospital"
                    src={`/hospital/index.html?xpPlayer=${encodeURIComponent(profile)}`}
                    style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                    allow="autoplay; fullscreen"
                  />
                </div>
                <div className="xp-statusbar">
                  <span>Daily case and practice ward · Progress saved for {profile}</span>
                </div>
              </>
            )}

            {/* My Documents (Account-Specific) */}
            {win.id === 'documents' && (
              <>
                <div className="xp-menubar">
                  <button type="button" className="xp-menubar-item">File</button>
                  <button type="button" className="xp-menubar-item">Edit</button>
                  <button type="button" className="xp-menubar-item">View</button>
                  <button type="button" className="xp-menubar-item" onClick={() => openWindow('help')}>Help</button>
                </div>
                <div className="xp-toolbar-strip">
                  <span style={{ color: '#555752' }}>Address:</span>
                  <input
                    readOnly
                    value={`C:\\Documents and Settings\\${profile}\\My Documents\\${activeAccount.gameShortTitle}`}
                    style={{
                      flex: 1,
                      border: '1px solid #7f9db9',
                      padding: '2px 6px',
                      background: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </div>
                <div className="xp-window-body" style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '16px' }}>
                    <button
                      type="button"
                      className="xp-btn"
                      style={{ flexDirection: 'column', padding: '14px 8px', textAlign: 'center' }}
                      onClick={() => openWindow(activeAccount.gameId)}
                    >
                      <img src={activeAccount.gameIcon} alt="" width={36} height={36} />
                      <b>{activeAccount.gameShortTitle}</b>
                      <small style={{ color: '#64748b' }}>{activeAccount.gameSub}</small>
                    </button>
                    <button
                      type="button"
                      className="xp-btn"
                      style={{ flexDirection: 'column', padding: '14px 8px', textAlign: 'center' }}
                      onClick={() => openWindow('help')}
                    >
                      <img src="/assets/icon-24.ico" alt="" width={36} height={36} />
                      <b>Read Me</b>
                      <small style={{ color: '#64748b' }}>How to Play</small>
                    </button>
                  </div>
                </div>
                <div className="xp-statusbar">
                  <span>2 objects</span>
                  <span>{activeAccount.accountLabel}</span>
                </div>
              </>
            )}

            {/* My Computer (Account-Specific) */}
            {win.id === 'computer' && (
              <>
                <div className="xp-menubar">
                  <button type="button" className="xp-menubar-item">File</button>
                  <button type="button" className="xp-menubar-item">View</button>
                  <button type="button" className="xp-menubar-item" onClick={() => openWindow('control')}>Control Panel</button>
                </div>
                <div className="xp-window-body" style={{ padding: '18px' }}>
                  <h3 style={{ margin: '0 0 10px', color: '#003399', borderBottom: '1px solid #95bdee', paddingBottom: '4px' }}>
                    Hard Disk Drives
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      className="xp-btn"
                      style={{ padding: '12px', justifyContent: 'flex-start', gap: '12px' }}
                      onClick={() => openWindow('documents')}
                    >
                      <img src="/assets/icon-16.ico" alt="" width={32} height={32} />
                      <div style={{ textAlign: 'left' }}>
                        <b>Local Disk (C:)</b>
                        <div style={{ color: '#64748b', fontSize: '10px' }}>Windows XP System · 24.8 GB Free</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="xp-btn"
                      style={{ padding: '12px', justifyContent: 'flex-start', gap: '12px' }}
                      onClick={() => openWindow(activeAccount.gameId)}
                    >
                      <img src={activeAccount.gameIcon} alt="" width={32} height={32} />
                      <div style={{ textAlign: 'left' }}>
                        <b>{activeAccount.driveLabel}</b>
                        <div style={{ color: '#64748b', fontSize: '10px' }}>{activeAccount.driveSub}</div>
                      </div>
                    </button>
                  </div>
                  <h3 style={{ margin: '0 0 10px', color: '#003399', borderBottom: '1px solid #95bdee', paddingBottom: '4px' }}>
                    Account & System Configuration
                  </h3>
                  <p style={{ lineHeight: 1.6, margin: '0 0 12px' }}>
                    Microsoft Windows XP Professional · Service Pack 3 (Simulation)<br />
                    Active Account: <b>{activeAccount.accountLabel}</b><br />
                    Logged-in User: <b>{profile}</b>
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="xp-btn primary" onClick={() => openWindow(activeAccount.gameId)}>
                      Launch {activeAccount.gameShortTitle}
                    </button>
                    <button type="button" className="xp-btn" onClick={() => openWindow('control')}>
                      Open Control Panel
                    </button>
                  </div>
                </div>
                <div className="xp-statusbar">
                  <span>My Computer</span>
                  <span>{activeAccount.accountLabel}</span>
                </div>
              </>
            )}

            {/* Control Panel */}
            {win.id === 'control' && (
              <>
                <div className="xp-window-body" style={{ padding: '18px', background: '#ece9d8' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #919b9c', padding: '16px', borderRadius: '4px' }}>
                    <h3 style={{ margin: '0 0 12px', color: '#003399' }}>
                      Desktop Background Wallpaper
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px' }}>
                      {(
                        [
                          ['bliss', 'Bliss (Windows XP Default)'],
                          ['luna', 'Luna Blue Radiance'],
                          ['teal', 'Classic Windows 98 Teal'],
                          ['autumn', 'Autumn Warmth'],
                        ] as [WallpaperId, string][]
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className={`xp-btn ${wallpaper === id ? 'primary' : ''}`}
                          onClick={() => setWallpaper(id)}
                        >
                          {wallpaper === id ? '● ' : '○ '}
                          {label}
                        </button>
                      ))}
                    </div>

                    <h3 style={{ margin: '0 0 10px', color: '#003399' }}>
                      User Profile & Audio
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <label htmlFor="xp-profile-input" style={{ minWidth: '90px' }}>Player Name:</label>
                      <input
                        id="xp-profile-input"
                        value={profile}
                        onChange={e => {
                          setProfile(e.target.value);
                          try {
                            localStorage.setItem('deadline-user', e.target.value);
                          } catch {}
                        }}
                        style={{
                          flex: 1,
                          border: '1px solid #7f9db9',
                          padding: '4px 8px',
                          borderRadius: '2px',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={soundEnabled}
                          onChange={e => setSoundEnabled(e.target.checked)}
                        />
                        Enable Windows XP Sound Effects
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={volume}
                        onChange={e => setVolume(Number(e.target.value))}
                        aria-label="Master Volume"
                      />
                      <span>{volume}%</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        className="xp-btn"
                        onClick={() => {
                          setWindows([]);
                          setShowLogin(true);
                        }}
                      >
                        Log Off / Switch Account...
                      </button>
                      <button type="button" className="xp-btn primary" onClick={() => closeWindow('control')}>
                        OK
                      </button>
                    </div>
                  </div>
                </div>
                <div className="xp-statusbar">
                  <span>Display & Audio Properties</span>
                  <span>Active Theme: Windows XP Luna</span>
                </div>
              </>
            )}

            {/* Notepad */}
            {win.id === 'notepad' && (
              <>
                <div className="xp-menubar">
                  <button type="button" className="xp-menubar-item">File</button>
                  <button type="button" className="xp-menubar-item">Edit</button>
                  <button type="button" className="xp-menubar-item">Format</button>
                </div>
                <div className="xp-window-body">
                  <textarea
                    value={notepadText}
                    onChange={e => setNotepadText(e.target.value)}
                    aria-label="Notes Editor"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 0,
                      padding: '10px',
                      font: '13px/1.5 "Courier New", monospace',
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                </div>
                <div className="xp-statusbar">
                  <span>Ln 1, Col 1</span>
                  <span>UTF-8</span>
                </div>
              </>
            )}

            {/* Help & How to Play (Strictly for the Logged-In Account) */}
            {win.id === 'help' && (
              <>
                <div className="xp-window-body" style={{ padding: '18px', lineHeight: 1.6 }}>
                  <h2 style={{ margin: '0 0 8px', color: '#003399' }}>
                    {activeAccount.helpTitle}
                  </h2>
                  <p>{activeAccount.helpIntro}</p>
                  <ul style={{ paddingLeft: '20px', margin: '10px 0' }}>
                    {activeAccount.helpBullets.map((b, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <p style={{ fontSize: '11px', color: '#475569', marginTop: '12px' }}>
                    Use the Start menu to <b>Log Off</b> if you wish to switch to a different Windows XP game account.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="xp-btn primary"
                      onClick={() => {
                        closeWindow('help');
                        openWindow(activeAccount.gameId);
                      }}
                    >
                      Open {activeAccount.gameShortTitle}
                    </button>
                    <button
                      type="button"
                      className="xp-btn"
                      onClick={() => {
                        setWindows([]);
                        playXpSound('logoff');
                        setShowLogin(true);
                      }}
                    >
                      Log Off / Switch Account
                    </button>
                  </div>
                </div>
                <div className="xp-statusbar">
                  <span>Windows XP Help and Support Center</span>
                  <span>{activeAccount.accountLabel}</span>
                </div>
              </>
            )}

            {/* Run Dialog */}
            {win.id === 'run' && (
              <div className="xp-window-body" style={{ padding: '16px', background: '#ece9d8' }}>
                <form onSubmit={handleRunSubmit}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                    <img src="/assets/icon-24.ico" alt="" width={32} height={32} />
                    <p style={{ margin: 0, fontSize: '11px' }}>
                      Type the name of a program for this account (<b>{activeAccount.gameId}</b>, <b>notepad</b>, <b>control</b>, <b>documents</b>), and Windows will open it for you.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <label htmlFor="xp-run-box">Open:</label>
                    <input
                      id="xp-run-box"
                      value={runInput}
                      onChange={e => setRunInput(e.target.value)}
                      style={{ flex: 1, border: '1px solid #7f9db9', padding: '4px 6px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="submit" className="xp-btn primary">OK</button>
                    <button type="button" className="xp-btn" onClick={() => closeWindow('run')}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Shutdown / Log Off Dialog */}
            {win.id === 'shutdown' && (
              <div className="xp-window-body" style={{ padding: '18px', background: '#ece9d8' }}>
                <h3 style={{ margin: '0 0 8px', color: '#003399' }}>End your Windows XP session?</h3>
                <p style={{ margin: '0 0 18px', color: '#334155', lineHeight: 1.5 }}>
                  Your progress in <b>{activeAccount.gameTitle}</b> is automatically saved in this browser for <b>{profile}</b>.
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="xp-btn primary"
                    onClick={() => {
                      setWindows([]);
                      playXpSound('logoff');
                      setShowLogin(true);
                    }}
                  >
                    Switch Account / Log Off
                  </button>
                  <button type="button" className="xp-btn" onClick={() => closeWindow('shutdown')}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {/* Desktop Right-Click Context Menu (Strictly for the Logged-In Account) */}
      {contextMenu && (
        <div
          className="xp-context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              openWindow(activeAccount.gameId);
            }}
          >
            <span>Open {activeAccount.gameTitle}</span>
            <b>Enter</b>
          </button>
          <div className="xp-start-sep" />
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              playXpSound('ding');
            }}
          >
            <span>Refresh Desktop</span>
            <span>F5</span>
          </button>
          <div className="xp-start-sep" />
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              openWindow('control');
            }}
          >
            <span>Properties</span>
          </button>
        </div>
      )}

      {/* Authentic Two-Column Windows XP Start Menu (Strictly for the Logged-In Account) */}
      {startOpen && (
        <nav className="xp-startmenu" aria-label="Start menu">
          <div className="xp-start-header">
            <div className="xp-start-avatar">
              <img src={activeAccount.gameIcon} alt="" />
            </div>
            <div className="xp-start-user">
              <strong>{profile}</strong>
              <span>{activeAccount.accountLabel}</span>
            </div>
          </div>

          <div className="xp-start-columns">
            <div className="xp-start-col-left">
              <button
                type="button"
                className="xp-start-item"
                onClick={() => openWindow(activeAccount.gameId)}
              >
                <img src={activeAccount.gameIcon} alt="" />
                <span>
                  <b>{activeAccount.gameShortTitle}</b>
                  <small>{activeAccount.gameSub}</small>
                </span>
              </button>
              <div className="xp-start-sep" />
              <button type="button" className="xp-start-item" onClick={() => openWindow('help')}>
                <img src="/assets/icon-24.ico" alt="" />
                <span>
                  <b>How to Play</b>
                  <small>{activeAccount.gameShortTitle} Guide</small>
                </span>
              </button>
            </div>

            <div className="xp-start-col-right">
              <button type="button" className="xp-start-item" onClick={() => openWindow('documents')}>
                <img src="/assets/folder.png" alt="" />
                <span>
                  <b>My Documents</b>
                </span>
              </button>
              <button type="button" className="xp-start-item" onClick={() => openWindow('computer')}>
                <img src="/assets/icon-16.ico" alt="" />
                <span>
                  <b>My Computer</b>
                </span>
              </button>
              <button type="button" className="xp-start-item" onClick={() => openWindow('control')}>
                <img src="/assets/icon-36.ico" alt="" />
                <span>
                  <b>Control Panel</b>
                </span>
              </button>
              <div className="xp-start-sep" />
              <button type="button" className="xp-start-item" onClick={() => openWindow('help')}>
                <img src="/assets/icon-24.ico" alt="" />
                <span>Help and Support</span>
              </button>
              <button type="button" className="xp-start-item" onClick={() => openWindow('run')}>
                <img src="/assets/icon-22.ico" alt="" />
                <span>Run...</span>
              </button>
            </div>
          </div>

          <div className="xp-start-footer">
            <button
              type="button"
              className="xp-start-footer-btn"
              onClick={() => {
                setStartOpen(false);
                setWindows([]);
                playXpSound('logoff');
                setShowLogin(true);
              }}
            >
              <img src="/assets/icon-48.ico" alt="" />
              <span>Log Off</span>
            </button>
            <button
              type="button"
              className="xp-start-footer-btn"
              onClick={() => openWindow('shutdown')}
            >
              <img src="/assets/windows-off.png" alt="" />
              <span>Turn Off Computer</span>
            </button>
          </div>
        </nav>
      )}

      {/* System Tray Volume Popover */}
      {showVolumePopup && (
        <div
          style={{
            position: 'absolute',
            right: '68px',
            bottom: '40px',
            background: '#ece9d8',
            border: '2px solid #0054e3',
            borderRadius: '4px',
            padding: '10px 14px',
            zIndex: 960,
            boxShadow: '2px 4px 12px rgba(0,0,0,0.35)',
            width: '180px',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#003399' }}>
            Master Volume ({volume}%)
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={e => setVolume(Number(e.target.value))}
            style={{ width: '100%', marginBottom: '8px' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!soundEnabled}
              onChange={e => setSoundEnabled(!e.target.checked)}
            />
            Mute all sounds
          </label>
        </div>
      )}

      {/* Windows XP Luna Bottom Taskbar */}
      <footer className="xp-taskbar" role="contentinfo" aria-label="Windows XP Taskbar">
        <button
          type="button"
          className={`xp-start-btn ${startOpen ? 'active' : ''}`}
          onClick={() => {
            setStartOpen(o => !o);
            setContextMenu(null);
            playXpSound('start');
          }}
          aria-expanded={startOpen}
          aria-label="Start"
        >
          <img src="/assets/windows.png" alt="" />
          <span>start</span>
        </button>

        <div className="xp-tasks" role="toolbar" aria-label="Running Applications">
          {windows.map(win => {
            const isActive = !win.minimized && activeTopId === win.id;
            return (
              <button
                key={win.id}
                type="button"
                className={`xp-task-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTaskClick(win)}
                title={win.title}
              >
                <img src={win.icon} alt="" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{win.title}</span>
              </button>
            );
          })}
        </div>

        <div className="xp-tray" aria-label="Notification Area">
          <button
            type="button"
            className="xp-tray-btn"
            onClick={() => openWindow(activeAccount.gameId)}
            title={`${activeAccount.gameTitle} Active`}
          >
            <img src={activeAccount.gameIcon} alt="" width={16} height={16} />
          </button>
          <button
            type="button"
            className="xp-tray-btn"
            onClick={() => setShowVolumePopup(v => !v)}
            title={soundEnabled ? `Volume: ${volume}%` : 'Audio Muted'}
            aria-label="Volume Settings"
          >
            <img src="/assets/volume-tray.svg" alt="" width={15} height={15} />
            <span>{soundEnabled ? '♫' : '✕'}</span>
          </button>
          <span
            style={{ fontVariantNumeric: 'tabular-nums', paddingLeft: '2px' }}
            title={`${activeAccount.accountLabel} · ${profile}`}
          >
            {clockText}
          </span>
        </div>
      </footer>

      {/* Windows XP Welcome / Account Selection Screen */}
      {showLogin && (
        <div className="xp-login-overlay" role="dialog" aria-label="Windows XP Welcome Screen">
          <div className="xp-login-top">
            <strong style={{ fontSize: '15px', letterSpacing: '0.5px' }}>
              Microsoft Windows XP · Account Selection
            </strong>
          </div>
          <div className="xp-login-center">
            <div style={{ textAlign: 'right', paddingRight: '12px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <img src="/assets/windows.png" alt="" width={38} height={38} />
                <h2 style={{ font: 'bold 34px Arial, sans-serif', margin: 0 }}>DEADLINE XP</h2>
              </div>
              <p style={{ fontSize: '14px', opacity: 0.92, margin: '8px 0 16px' }}>
                To begin, enter your name and click a Windows XP account:
              </p>
              <input
                value={profile}
                onChange={e => setProfile(e.target.value)}
                placeholder="Your name"
                aria-label="Player Name"
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '2px solid #93c5fd',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '14px',
                  width: '240px',
                }}
              />
            </div>

            <div className="xp-login-divider" />

            <div>
              <button
                type="button"
                className={`xp-account-tile ${accountMode === 'hospital' ? 'active' : ''}`}
                onClick={() => handleLoginAccount('hospital')}
              >
                <img src="/assets/hospital-xp.svg" alt="" />
                <div>
                  <strong style={{ fontSize: '16px', display: 'block' }}>Hospital Ward (Ward Rounds 3D)</strong>
                  <span style={{ fontSize: '12px', color: '#dbeafe' }}>
                    Minecraft Voxel Hospital · 7 Floors · Daily & Practice Cases
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={`xp-account-tile ${accountMode === 'cash' ? 'active' : ''}`}
                onClick={() => handleLoginAccount('cash')}
              >
                <img src="/assets/user.png" alt="" />
                <div>
                  <strong style={{ fontSize: '16px', display: 'block' }}>The Missing Cash</strong>
                  <span style={{ fontSize: '12px', color: '#dbeafe' }}>
                    Office Forensics & Register Discrepancy Investigation
                  </span>
                </div>
              </button>

              <button
                type="button"
                className={`xp-account-tile ${accountMode === 'outbreak' ? 'active' : ''}`}
                onClick={() => handleLoginAccount('outbreak')}
              >
                <img src="/assets/icon-48.ico" alt="" />
                <div>
                  <strong style={{ fontSize: '16px', display: 'block' }}>Virus Outbreak</strong>
                  <span style={{ fontSize: '12px', color: '#dbeafe' }}>
                    15 Desktop Challenges, Upgrades & System Recovery
                  </span>
                </div>
              </button>
            </div>
          </div>
          <div className="xp-login-bottom">
            <span style={{ fontSize: '12px', opacity: 0.9 }}>
              Each Windows XP account has its own dedicated desktop and game.
            </span>
            <span>All saves are stored locally in your browser.</span>
          </div>
        </div>
      )}
    </div>
  );
}

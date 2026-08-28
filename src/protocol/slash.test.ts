import { describe, expect, it } from 'vitest';
import {
  buildLook,
  buildSlash,
  chargenReady,
  expandSlash,
  isQuitLine,
  isRestartSwitch,
  jobsReady,
  marketReady,
  needsChargenScreen,
  needsGigScreen,
  needsJobsScreen,
  needsGearScreen,
  needsMarketScreen,
  panelPathFor,
  needsRestartConfirm,
  restartReady,
  matchSlash,
  parseLookLine,
  parseSlashLine,
  restAfterAlias,
  SLASH_COMMANDS,
  completeSlash,
  slashHitArm,
  stepSlashPick,
  revealInView,
} from './slash';

describe('parseLookLine', () => {
  it('accepts look /look /l l with optional target', () => {
    expect(parseLookLine('look')).toEqual({ verb: 'look', target: '' });
    expect(parseLookLine('/look')).toEqual({ verb: 'look', target: '' });
    expect(parseLookLine('/l')).toEqual({ verb: 'look', target: '' });
    expect(parseLookLine('l')).toEqual({ verb: 'look', target: '' });
    expect(parseLookLine('look kess')).toEqual({ verb: 'look', target: 'kess' });
    expect(parseLookLine('/look rusty locker')).toEqual({ verb: 'look', target: 'rusty locker' });
    expect(parseLookLine('l kess')).toEqual({ verb: 'look', target: 'kess' });
  });

  it('does not steal ordinary prose', () => {
    expect(parseLookLine('looks around')).toBeNull();
    expect(parseLookLine('leans on the rail')).toBeNull();
    expect(parseLookLine('hello')).toBeNull();
  });
});

describe('buildLook', () => {
  it('omits a blank target', () => {
    expect(buildLook('')).toBe('look');
    expect(buildLook('  kess ')).toBe('look kess');
    expect(buildLook('KESS(#7)')).toBe('look KESS');
    expect(buildLook('#19')).toBe('look #19');
  });
});

describe('matchSlash', () => {
  it('lists LOOK, chargen, jobs, and quit for / and prefixes', () => {
    expect(matchSlash('/').map((c) => c.id)).toEqual([
      'look',
      'help',
      'chargen',
      'short-desc',
      'roll',
      'attack',
      'npc',
      'gig',
      'jobs',
      'market',
      'ping',
      'console',
      'quit',
    ]);
    expect(matchSlash('/l').map((c) => c.id)).toEqual([
      'look',
      'chargen-list',
      'heal-lazarus',
      'gear-load',
      'lock',
    ]);
    expect(matchSlash('look').map((c) => c.id)).toEqual(['look']);
    expect(matchSlash('l').map((c) => c.id)).toEqual(['look']);
    expect(matchSlash('/ch').map((c) => c.id)).toContain('chargen');
    expect(matchSlash('/console').map((c) => c.id)).toEqual(['console']);
    expect(matchSlash('/quit').map((c) => c.id)).toEqual(['quit']);
    expect(matchSlash('quit').map((c) => c.id)).toEqual(['quit']);
    expect(matchSlash('hello')).toEqual([]);
    expect(matchSlash('looks')).toEqual([]);
    expect(matchSlash('leans')).toEqual([]);
    expect(matchSlash('+')).toEqual([]);
    expect(matchSlash('+ ')).toEqual([]);
    expect(matchSlash('+roll').map((c) => c.id)).toEqual(['roll']);
    expect(matchSlash('+attack')).toEqual([]);
  });
});

describe('parseSlashLine', () => {
  it('maps chargen aliases onto +chargen verbs', () => {
    expect(parseSlashLine('/chargen')?.cmd.id).toBe('chargen');
    expect(parseSlashLine('/stat MOR=2')).toEqual({
      cmd: expect.objectContaining({ id: 'chargen-stat' }),
      target: 'MOR=2',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen-stat')!, 'COG=2')).toBe(
      '+chargen/stat COG=2',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen')!, 'submit')).toBe(
      '+chargen/submit',
    );
    expect(parseSlashLine('+note Harbor Keys')?.cmd.id).toBe('chargen-note');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen-note')!, 'Harbor Keys')).toBe(
      '+chargen/note Harbor Keys',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen-cash')!, '')).toBe(
      '+chargen/cash',
    );
    expect(parseSlashLine('/restart confirm')).toEqual({
      cmd: expect.objectContaining({ id: 'chargen-restart' }),
      target: 'confirm',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen-restart')!, '')).toBe(
      '+chargen/restart',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen-restart')!, 'confirm')).toBe(
      '+chargen/restart confirm',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'chargen')!, 'restart confirm')).toBe(
      '+chargen/restart confirm',
    );
  });

  it('maps /quit /exit /logout and bare quit onto quit', () => {
    expect(parseSlashLine('/quit')?.cmd.id).toBe('quit');
    expect(parseSlashLine('/exit')?.cmd.id).toBe('quit');
    expect(parseSlashLine('quit')?.cmd.id).toBe('quit');
    expect(parseSlashLine('QUIT')?.cmd.id).toBe('quit');
    expect(parseSlashLine('/console')?.cmd.id).toBe('console');
    expect(parseSlashLine('/tty')?.cmd.id).toBe('console');
    expect(parseSlashLine('/street')?.cmd.id).toBe('street');
    expect(parseSlashLine('/play')?.cmd.id).toBe('street');
    expect(parseSlashLine('/comms')?.cmd.id).toBe('comms');
    expect(parseSlashLine('/sheet')?.cmd.id).toBe('sheet');
    expect(parseSlashLine('/map')?.cmd.id).toBe('map');
    expect(parseSlashLine('/deck')?.cmd.id).toBe('deck');
    expect(parseSlashLine('/staff')?.cmd.id).toBe('staff');
    expect(parseSlashLine('/hack')?.cmd.id).toBe('hack');
    expect(parseSlashLine('/gig/push')?.cmd.id).toBe('gig-push');
    expect(parseSlashLine('/push')?.cmd.id).toBe('gig-push');
    expect(parseSlashLine('/deeper')?.cmd.id).toBe('gig-push');
    expect(parseSlashLine('+gig/push')?.cmd.id).toBe('gig-push');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'gig-push')!, '')).toBe(
      '+gig/push',
    );
    expect(expandSlash(SLASH_COMMANDS.find((c) => c.id === 'gig-push')!, '')).toEqual([
      '+gig/push',
      'look',
    ]);
    expect(parseSlashLine('/lock')?.cmd.id).toBe('lock');
    expect(parseSlashLine('/lock north')).toEqual({
      cmd: expect.objectContaining({ id: 'lock' }),
      target: 'north',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'lock')!, '')).toBe('');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'lock')!, 'north')).toBe('+lock north');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'lock')!, 'north=ds/12')).toBe(
      '+lock north=ds/12',
    );
    expect(expandSlash(SLASH_COMMANDS.find((c) => c.id === 'lock')!, 'north')).toEqual([
      '+lock north',
      'look',
    ]);
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'console')!, '')).toBe('');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'street')!, '')).toBe('');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'street')!)).toBe('/play');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'comms')!)).toBe('/comms');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'inventory')!)).toBe('/inventory');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'hack')!)).toBe('/deck');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'deck')!)).toBe('/deck');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'lock')!)).toBeNull();
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'gig')!)).toBe('/gig');
    expect(needsGigScreen(SLASH_COMMANDS.find((c) => c.id === 'gig')!, '')).toBe(true);
    expect(needsGigScreen(SLASH_COMMANDS.find((c) => c.id === 'gig')!, 'enter')).toBe(false);
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'quit')!, '')).toBe('quit');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'quit')!, 'now')).toBe('quit');
    expect(parseSlashLine('quits')).toBeNull();
    expect(parseSlashLine('exit')).toBeNull();
  });

  it('maps jobs aliases onto +job / +jobs / +request verbs', () => {
    expect(parseSlashLine('/jobs')?.cmd.id).toBe('jobs');
    expect(parseSlashLine('+jobs/approve 5=Looks good')).toEqual({
      cmd: expect.objectContaining({ id: 'jobs-approve' }),
      target: '5=Looks good',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs')!, '')).toBe('+jobs');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs')!, '5')).toBe('+job 5');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs')!, 'approve 5=Looks good')).toBe(
      '+job/approve 5=Looks good',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs')!, 'cgen')).toBe('+job/bucket CGEN');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs')!, 'comment 5=wait')).toBe(
      '+request/comment 5=wait',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs')!, 'ops 5=check bg')).toBe(
      '+job/note 5=check bg',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-approve')!, '5=Looks good')).toBe(
      '+job/approve 5=Looks good',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-deny')!, '5=Need more note')).toBe(
      '+job/deny 5=Need more note',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-comment')!, '5=wait')).toBe(
      '+request/comment 5=wait',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-staff-comment')!, '5=wait')).toBe(
      '+job/comment 5=wait',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-ops')!, '5=check bg')).toBe(
      '+job/note 5=check bg',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-read')!, '5')).toBe('+job 5');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'jobs-request')!, 'lamp=flicker')).toBe(
      '+request lamp=flicker',
    );
  });

  it('maps market aliases onto +market verbs', () => {
    expect(parseSlashLine('/market')?.cmd.id).toBe('market');
    expect(parseSlashLine('/buy pkd-45')).toEqual({
      cmd: expect.objectContaining({ id: 'market-buy' }),
      target: 'pkd-45',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'market')!, '')).toBe('+market');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'market')!, 'guns')).toBe('+market firearm');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'market')!, 'buy hyperion')).toBe(
      '+market/buy hyperion',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'market-buy')!, 'pkd-45=2')).toBe(
      '+market/buy pkd-45=2',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'market-info')!, 'vest')).toBe(
      '+market/info vest',
    );
  });

  it('maps /use /drop /give /wear /wield /stow onto pack verbs', () => {
    expect(parseSlashLine('/use toolkit')).toEqual({
      cmd: expect.objectContaining({ id: 'gear-use' }),
      target: 'toolkit',
    });
    expect(parseSlashLine('/drop katana')?.cmd.id).toBe('gear-drop');
    expect(parseSlashLine('/give katana=Alice')).toEqual({
      cmd: expect.objectContaining({ id: 'gear-give' }),
      target: 'katana=Alice',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'gear-use')!, 'toolkit')).toBe('use toolkit');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'gear-drop')!, 'katana')).toBe('drop katana');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'gear-give')!, 'katana=Alice')).toBe(
      'give katana=Alice',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'gear-wield')!, 'PKD-45')).toBe('wield PKD-45');
    expect(parseSlashLine('/load pkd=hellfires')?.cmd.id).toBe('gear-load');
    expect(parseSlashLine('/inv')?.cmd.id).toBe('inventory');
    expect(parseSlashLine('inventory')?.cmd.id).toBe('inventory');
    expect(parseSlashLine('/desc')?.cmd.id).toBe('desc');
    expect(parseSlashLine('/short')?.cmd.id).toBe('short-desc');
    expect(parseSlashLine('/shortdesc wet coat')).toEqual({
      cmd: expect.objectContaining({ id: 'short-desc' }),
      target: 'wet coat',
    });
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'short-desc')!, '')).toBe(
      '&short-desc me',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'short-desc')!, 'wet coat')).toBe(
      '&short-desc me=wet coat',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'short-desc')!, 'locker=dusty')).toBe(
      '&short-desc locker=dusty',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'desc')!, 'roll')).toBe('+desc/roll');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'desc')!, 'set Rain on chrome.')).toBe(
      '+desc/set Rain on chrome.',
    );
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'desc-gen')!, '')).toBe('+desc/gen');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'gear-mod')!, 'pkd=smart-link')).toBe(
      '+gear/mod pkd=smart-link',
    );
    expect(parseSlashLine('use the door')).toBeNull();
    expect(parseSlashLine('drop it')).toBeNull();
  });

  it('hooks /rea /cog /aff onto +roll without stealing /affect', () => {
    expect(parseSlashLine('/rea')?.cmd.id).toBe('roll-rea');
    expect(parseSlashLine('/cog')?.cmd.id).toBe('roll-cog');
    expect(parseSlashLine('/aff')?.cmd.id).toBe('roll-aff');
    expect(parseSlashLine('/affect')?.cmd.id).toBe('chargen-affect');
    expect(parseSlashLine('/roll COG/12')?.cmd.id).toBe('roll');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'roll-rea')!, '')).toBe('+roll REA');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'roll-cog')!, '12')).toBe('+roll COG/12');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'roll-aff')!, '+bg')).toBe('+roll AFF +bg');
    expect(buildSlash(SLASH_COMMANDS.find((c) => c.id === 'roll')!, 'REA')).toBe('+roll REA');
    expect(panelPathFor(SLASH_COMMANDS.find((c) => c.id === 'roll-cog')!)).toBe('/play');
  });
});

describe('expandSlash', () => {
  it('opens a draft before a chargen switch that needs one', () => {
    const stat = SLASH_COMMANDS.find((c) => c.id === 'chargen-stat')!;
    expect(expandSlash(stat, 'COG=2')).toEqual(['+chargen/start', '+chargen/stat COG=2']);
    const cash = SLASH_COMMANDS.find((c) => c.id === 'chargen-cash')!;
    expect(expandSlash(cash, '')).toEqual(['+chargen/start', '+chargen/cash']);
    const aug = SLASH_COMMANDS.find((c) => c.id === 'chargen-aug')!;
    expect(expandSlash(aug, 'none')).toEqual(['+chargen/start', '+chargen/aug none']);
    expect(expandSlash(aug, 'neurochem')).toEqual(['+chargen/start', '+chargen/aug neurochem']);
    const look = SLASH_COMMANDS.find((c) => c.id === 'look')!;
    expect(expandSlash(look, 'kess')).toEqual(['look kess']);
    const ping = SLASH_COMMANDS.find((c) => c.id === 'ping')!;
    expect(expandSlash(ping, 'kess')).toEqual(['+ping kess']);
    expect(expandSlash(ping, '')).toEqual(['+ping']);
    const quit = SLASH_COMMANDS.find((c) => c.id === 'quit')!;
    expect(expandSlash(quit, '')).toEqual(['quit']);
    expect(expandSlash(quit, 'now')).toEqual(['quit']);
    const tty = SLASH_COMMANDS.find((c) => c.id === 'console')!;
    expect(expandSlash(tty, '')).toEqual([]);
    const restart = SLASH_COMMANDS.find((c) => c.id === 'chargen-restart')!;
    expect(expandSlash(restart, 'confirm')).toEqual(['+chargen/restart confirm']);
    expect(expandSlash(restart, '')).toEqual(['+chargen/restart']);
  });
});

describe('chargenReady', () => {
  it('auto-fires start cash submit, never a bare restart', () => {
    expect(chargenReady('start')).toBe(true);
    expect(chargenReady('cash')).toBe(true);
    expect(chargenReady('submit')).toBe(true);
    expect(chargenReady('restart')).toBe(false);
    expect(chargenReady('restart ')).toBe(false);
    expect(chargenReady('restart confirm')).toBe(false);
  });
});

describe('restartReady', () => {
  it('only the confirm tokens wipe, and entering restart stays armed', () => {
    expect(restartReady('confirm')).toBe(true);
    expect(restartReady('yes')).toBe(true);
    expect(restartReady('wipe')).toBe(true);
    expect(restartReady('')).toBe(false);
    expect(isRestartSwitch('restart')).toBe(true);
    expect(isRestartSwitch('restart ')).toBe(true);
    expect(isRestartSwitch('restart confirm')).toBe(false);
    const restart = SLASH_COMMANDS.find((c) => c.id === 'chargen-restart')!;
    const parent = SLASH_COMMANDS.find((c) => c.id === 'chargen')!;
    expect(needsRestartConfirm(restart, '')).toBe(true);
    expect(needsRestartConfirm(restart, 'confirm')).toBe(false);
    expect(needsRestartConfirm(parent, 'restart')).toBe(true);
    expect(needsRestartConfirm(parent, 'restart confirm')).toBe(false);
  });
});

describe('needsChargenScreen', () => {
  it('sends wizard verbs to the dossier, not list or info', () => {
    const byId = (id: string) => SLASH_COMMANDS.find((c) => c.id === id)!;
    expect(needsChargenScreen(byId('chargen'))).toBe(true);
    expect(needsChargenScreen(byId('chargen-stat'), 'MOR=2')).toBe(true);
    expect(needsChargenScreen(byId('chargen-start'))).toBe(true);
    expect(needsChargenScreen(byId('chargen-restart'))).toBe(true);
    expect(needsChargenScreen(byId('chargen'), 'list backgrounds')).toBe(false);
    expect(needsChargenScreen(byId('chargen-list'), 'quirks')).toBe(false);
    expect(needsChargenScreen(byId('chargen-info'), 'nodejacker')).toBe(false);
    expect(needsChargenScreen(byId('look'))).toBe(false);
    expect(needsChargenScreen(byId('quit'))).toBe(false);
  });
});

describe('needsJobsScreen', () => {
  it('opens staff for list/read/approve, not request', () => {
    const byId = (id: string) => SLASH_COMMANDS.find((c) => c.id === id)!;
    expect(needsJobsScreen(byId('jobs'))).toBe(true);
    expect(needsJobsScreen(byId('jobs-approve'), '5=ok')).toBe(true);
    expect(needsJobsScreen(byId('jobs-deny'))).toBe(true);
    expect(needsJobsScreen(byId('jobs-read'), '5')).toBe(true);
    expect(needsJobsScreen(byId('jobs-request'), 'lamp=flicker')).toBe(false);
    expect(needsJobsScreen(byId('jobs'), 'request lamp=flicker')).toBe(false);
    expect(needsJobsScreen(byId('look'))).toBe(false);
  });
});

describe('needsGearScreen', () => {
  it('opens the pack for use drop give wear', () => {
    const byId = (id: string) => SLASH_COMMANDS.find((c) => c.id === id)!;
    expect(needsGearScreen(byId('gear-use'))).toBe(true);
    expect(needsGearScreen(byId('gear-drop'))).toBe(true);
    expect(needsGearScreen(byId('gear-give'))).toBe(true);
    expect(needsGearScreen(byId('gear-load'))).toBe(true);
    expect(needsGearScreen(byId('gear-mod'))).toBe(true);
    expect(needsGearScreen(byId('inventory'))).toBe(true);
    expect(needsGearScreen(byId('look'))).toBe(false);
    expect(panelPathFor(byId('inventory'))).toBe('/inventory');
    expect(panelPathFor(byId('gear-drop'))).toBe('/inventory');
    expect(panelPathFor(byId('look'))).toBeNull();
  });
});

describe('needsMarketScreen', () => {
  it('opens the stall for browse, buy, and info', () => {
    const byId = (id: string) => SLASH_COMMANDS.find((c) => c.id === id)!;
    expect(needsMarketScreen(byId('market'))).toBe(true);
    expect(needsMarketScreen(byId('market-buy'), 'pkd-45')).toBe(true);
    expect(needsMarketScreen(byId('market-info'))).toBe(true);
    expect(needsMarketScreen(byId('look'))).toBe(false);
  });
});

describe('marketReady', () => {
  it('auto-fires category locks, never a bare buy', () => {
    expect(marketReady('firearm')).toBe(true);
    expect(marketReady('guns')).toBe(true);
    expect(marketReady('buy')).toBe(false);
    expect(marketReady('buy pkd')).toBe(false);
    expect(marketReady('')).toBe(false);
  });
});

describe('jobsReady', () => {
  it('auto-fires list filters, never a bare approve', () => {
    expect(jobsReady('cgen')).toBe(true);
    expect(jobsReady('all')).toBe(true);
    expect(jobsReady('approve')).toBe(false);
    expect(jobsReady('approve 5')).toBe(false);
    expect(jobsReady('')).toBe(false);
  });
});

describe('isQuitLine', () => {
  it('only the bare quit verb jacks out', () => {
    expect(isQuitLine('quit')).toBe(true);
    expect(isQuitLine('QUIT')).toBe(true);
    expect(isQuitLine('  quit  ')).toBe(true);
    expect(isQuitLine('/quit')).toBe(false);
    expect(isQuitLine('quit now')).toBe(false);
    expect(isQuitLine('quits')).toBe(false);
    expect(isQuitLine('pose quit')).toBe(false);
  });
});

describe('restAfterAlias', () => {
  const look = SLASH_COMMANDS[0];

  it('keeps the leftover target after the chosen alias', () => {
    expect(restAfterAlias('/look', look)).toBe('');
    expect(restAfterAlias('/look kess', look)).toBe('kess');
    expect(restAfterAlias('l rusty locker', look)).toBe('rusty locker');
    expect(restAfterAlias('LOOK HERE', look)).toBe('HERE');
  });
});

describe('completeSlash', () => {
  const look = SLASH_COMMANDS.find((cmd) => cmd.id === 'look')!;
  const attack = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack')!;
  const list = SLASH_COMMANDS.find((cmd) => cmd.id === 'chargen-list')!;

  it('fills the longest alias for a typed prefix into the box', () => {
    expect(completeSlash('/att', attack)).toBe('/attack');
    expect(completeSlash('/l', look)).toBe('/look');
    expect(completeSlash('/l kess', look)).toBe('/look kess');
    expect(completeSlash('/atk', attack)).toBe('/atk');
    expect(completeSlash('/list', list)).toBe('/list');
  });
});

describe('slashHitArm', () => {
  const look = SLASH_COMMANDS.find((cmd) => cmd.id === 'look')!;
  const chargen = SLASH_COMMANDS.find((cmd) => cmd.id === 'chargen')!;
  const attack = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack')!;

  it('Tab on a hit arms it with leftover args, same as a click', () => {
    expect(slashHitArm('/l', look)).toEqual({ cmd: look, rest: '' });
    expect(slashHitArm('/look kess', look)).toEqual({ cmd: look, rest: 'kess' });
    expect(slashHitArm('/c', chargen)).toEqual({ cmd: chargen, rest: '' });
    expect(slashHitArm('/att', attack)).toEqual({ cmd: attack, rest: '' });
    expect(slashHitArm('/attack cop', attack)).toEqual({ cmd: attack, rest: 'cop' });
    const aim = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-aim')!;
    const burst = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-burst')!;
    const auto = SLASH_COMMANDS.find((cmd) => cmd.id === 'attack-auto')!;
    expect(slashHitArm('/aim', aim)).toEqual({ cmd: aim, rest: '' });
    expect(slashHitArm('/burst', burst)).toEqual({ cmd: burst, rest: '' });
    expect(slashHitArm('/auto', auto)).toEqual({ cmd: auto, rest: '' });
  });
});

describe('stepSlashPick', () => {
  it('wraps up and down through the optic', () => {
    expect(stepSlashPick(4, 0, 1)).toBe(1);
    expect(stepSlashPick(4, 3, 1)).toBe(0);
    expect(stepSlashPick(4, 0, -1)).toBe(3);
    expect(stepSlashPick(0, 0, 1)).toBe(0);
  });
});

describe('revealInView', () => {
  it('scrolls down when the pick sits below the fold', () => {
    expect(revealInView(0, 100, 120, 40)).toBe(60);
  });

  it('scrolls up when the pick sits above the fold', () => {
    expect(revealInView(80, 100, 10, 40)).toBe(10);
  });

  it('leaves the list still when the pick is already visible', () => {
    expect(revealInView(40, 100, 50, 40)).toBe(40);
  });
});

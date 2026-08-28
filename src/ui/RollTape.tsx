import { useEffect, useState } from 'react';
import {
  droppedDice,
  formatRollMath,
  formatRollTag,
  type RollPayload,
} from '../protocol/frames';

function dieClass(die: number): string | undefined {
  if (die === 1) return 'one';
  if (die === 6) return 'six';
  return undefined;
}

export function RollTape({ roll, live = false }: { roll: RollPayload; live?: boolean }) {
  const [flicker, setFlicker] = useState(live);
  useEffect(() => {
    if (!live) return;
    setFlicker(true);
    const id = window.setTimeout(() => setFlicker(false), 520);
    return () => window.clearTimeout(id);
  }, [live, roll.total, roll.dice.join(',')]);

  const dropped = droppedDice(roll.dice, roll.kept);
  const mark = roll.success ? 'HIT' : 'MISS';
  const margin = roll.margin === 0 ? 'EVEN' : roll.margin > 0 ? `+${roll.margin}` : String(roll.margin);
  const dmg: string[] = [];
  if (roll.damageToTarget) dmg.push(`DEALT ${roll.damageToTarget}`);
  if (roll.damageToSelf) dmg.push(`TAKEN ${roll.damageToSelf}`);

  return (
    <div className={`roll-tape${roll.success ? ' hit' : ' miss'}${flicker ? ' flicker' : ''}`}>
      <div className="tag">
        <span>{formatRollTag(roll)}</span>
        <span className="mark">{mark}</span>
      </div>
      <div className="dice">
        {roll.kept.map((die, i) => (
          <i key={`k${i}`} className={dieClass(die)}>
            {die}
          </i>
        ))}
        {dropped.map((die, i) => (
          <i key={`d${i}`} className="drop">
            {die}
          </i>
        ))}
      </div>
      {roll.doubleSix ? <div className="note">DOUBLE 6 · EXPLODE +{roll.explodeBonus}</div> : null}
      {roll.doubleOne || roll.needNerveCheck ? <div className="note warn">DOUBLE 1 · NERVE</div> : null}
      <div className="eq">{formatRollMath(roll)}</div>
      <div className="sum">
        <span>
          DS {roll.ds} · MARGIN {margin}
        </span>
        <span className="tot">{roll.total}</span>
      </div>
      {dmg.length ? <div className="note">{dmg.join(' · ')}</div> : null}
      {roll.flavor ? <div className="flavor">{roll.flavor}</div> : null}
    </div>
  );
}

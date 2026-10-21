import pioneer from '../assets/recruit-tickets/rogue6-recruit-pioneer.png';
import warrior from '../assets/recruit-tickets/rogue6-recruit-warrior.png';
import tank from '../assets/recruit-tickets/rogue6-recruit-tank.png';
import sniper from '../assets/recruit-tickets/rogue6-recruit-sniper.png';
import caster from '../assets/recruit-tickets/rogue6-recruit-caster.png';
import medic from '../assets/recruit-tickets/rogue6-recruit-medic.png';
import support from '../assets/recruit-tickets/rogue6-recruit-support.png';
import special from '../assets/recruit-tickets/rogue6-recruit-special.png';
import assault from '../assets/recruit-tickets/rogue6-recruit-double_1.png';
import bastion from '../assets/recruit-tickets/rogue6-recruit-double_2.png';
import remote from '../assets/recruit-tickets/rogue6-recruit-double_3.png';
import destruction from '../assets/recruit-tickets/rogue6-recruit-double_4.png';
import ground from '../assets/recruit-tickets/rogue6-recruit-quad_melee.png';
import ranged from '../assets/recruit-tickets/rogue6-recruit-quad_ranged.png';
import any from '../assets/recruit-tickets/rogue6-recruit-all.png';

/** ArknightsAssets2 国服黑流树海招募券原图，按抽取规则中的招募券 id 对应。 */
export const RECRUIT_TICKET_IMAGES: Readonly<Record<string, string>> = {
  'single-PIONEER': pioneer,
  'single-WARRIOR': warrior,
  'single-TANK': tank,
  'single-SNIPER': sniper,
  'single-CASTER': caster,
  'single-MEDIC': medic,
  'single-SUPPORT': support,
  'single-SPECIAL': special,
  'guard-vanguard': assault,
  'defender-supporter': bastion,
  'sniper-medic': remote,
  'caster-specialist': destruction,
  ground,
  ranged,
  any,
};

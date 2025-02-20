import { DialogRef, DIALOG_DATA, Dialog } from "@angular/cdk/dialog";
import { ChangeDetectorRef, Component, ElementRef, HostListener, Inject, ViewChild } from "@angular/core";
import { GameManager, gameManager } from "src/app/game/businesslogic/GameManager";
import { SettingsManager, settingsManager } from "src/app/game/businesslogic/SettingsManager";
import { Action, ActionType, ActionValueType } from "src/app/game/model/data/Action";
import { AttackModifier, AttackModifierDeck, AttackModifierType } from "src/app/game/model/data/AttackModifier";
import { Character } from "src/app/game/model/Character";
import { ConditionName, ConditionType, EntityCondition, EntityConditionState } from "src/app/game/model/data/Condition";
import { Entity, EntityValueFunction } from "src/app/game/model/Entity";
import { Figure } from "src/app/game/model/Figure";
import { Monster } from "src/app/game/model/Monster";
import { MonsterEntity } from "src/app/game/model/MonsterEntity";
import { MonsterType } from "src/app/game/model/data/MonsterType";
import { Objective, OBJECTIV_MARKERS } from "src/app/game/model/Objective";
import { Summon, SummonState } from "src/app/game/model/Summon";
import { ghsDefaultDialogPositions, ghsModulo, ghsValueSign } from "../../helper/Static";
import { AttackModiferDeckChange } from "../attackmodifier/attackmodifierdeck";
import { MonsterNumberPickerDialog } from "../monster/dialogs/numberpicker-dialog";
import { Overlay } from "@angular/cdk/overlay";

@Component({
  selector: 'ghs-entity-menu-dialog',
  templateUrl: 'entity-menu-dialog.html',
  styleUrls: ['./entity-menu-dialog.scss']
})
export class EntityMenuDialogComponent {

  gameManager: GameManager = gameManager;
  settingsManager: SettingsManager = settingsManager;

  @ViewChild('charactertitle', { static: false }) characterTitleInput!: ElementRef;
  @ViewChild('objectiveTitle', { static: false }) objectiveTitleInput!: ElementRef;
  @ViewChild('summonTitle', { static: false }) summonTitleInput!: ElementRef;

  conditionType: 'character' | 'monster' | '' = '';

  levelDialog: boolean = false;

  health: number = 0;
  experience: number = 0;
  loot: number = 0;
  maxHp: number = 0;
  attack: number = 0;
  movement: number = 0;
  range: number = 0;
  bless: number = 0;
  curse: number = 0;
  empower: number = 0;
  enfeeble: number = 0;
  marker: number = 0;
  id: number = 0;
  characterToken: number = 0;
  characterTokenValues: number[] = [];
  objectiveDead: boolean = false;
  entityConditions: EntityCondition[] = [];
  actionHints: Action[] = [];

  titles: string[] = [];

  AttackModifierType = AttackModifierType;
  SummonState = SummonState;
  ConditionName = ConditionName;
  ConditionType = ConditionType;
  MonsterType = MonsterType;
  OBJECTIV_MARKERS = OBJECTIV_MARKERS;
  EntityValueFunction = EntityValueFunction;
  ghsModulo = ghsModulo;

  constructor(@Inject(DIALOG_DATA) public data: { entity: Entity | undefined, figure: Figure, positionElement: ElementRef }, private changeDetectorRef: ChangeDetectorRef, private dialogRef: DialogRef, private dialog: Dialog, private overlay: Overlay) {
    if (data.entity instanceof Character) {
      this.conditionType = 'character';
      this.characterToken = data.entity.token;
      for (let index = 0; index < data.entity.tokens.length; index++) {
        this.characterTokenValues[index] = data.entity.tokenValues[index] || 0;
      }

      if (data.entity.identities && data.entity.identities.length > 1 && settingsManager.settings.characterIdentities) {
        this.titles = data.entity.title.split('|');
        if (this.titles.length < data.entity.identities.length) {
          for (let i = this.titles.length; i < data.entity.identities.length; i++) {
            this.titles.push('');
          }
        }
        for (let i = 0; i < this.titles.length; i++) {
          if (!this.titles[i]) {
            this.titles[i] = settingsManager.getLabel('data.character.' + data.entity.name.toLowerCase());
          }
        }
      }
    } else if (data.entity instanceof Objective) {
      this.conditionType = 'character';
    } else if (data.entity instanceof MonsterEntity) {
      this.conditionType = 'monster';
    } else if (data.entity instanceof Summon) {
      this.conditionType = 'monster';
      if (data.entity.init) {
        this.levelDialog = true;
      }
    }
    if (this.data.entity) {
      this.entityConditions = JSON.parse(JSON.stringify(this.data.entity.entityConditions))
    }

    if (this.data.figure instanceof Monster && this.data.entity instanceof MonsterEntity) {
      this.actionHints = gameManager.monsterManager.calcActionHints(this.data.figure, this.data.entity).map((actionHint) => new Action(actionHint.type, actionHint.value, ActionValueType.fixed, actionHint.range ? [new Action(ActionType.range, actionHint.range, ActionValueType.fixed, [], true)] : []));
    }

    this.dialogRef.closed.subscribe({
      next: (forced) => {
        if (!forced) {
          this.close();
        }
      }
    })
  }

  @HostListener('document:keydown', ['$event'])
  keyboardShortcuts(event: KeyboardEvent) {
    if (!this.levelDialog && !event.altKey && !event.metaKey && (!window.document.activeElement || window.document.activeElement.tagName != 'INPUT' && window.document.activeElement.tagName != 'SELECT' && window.document.activeElement.tagName != 'TEXTAREA')) {
      if (!event.ctrlKey && !event.shiftKey && event.key === 'ArrowRight') {
        this.changeHealth(1);
        event.preventDefault();
      } else if (!event.ctrlKey && !event.shiftKey && event.key === 'ArrowLeft') {
        this.changeHealth(-1);
        event.preventDefault();
      } else if (!event.ctrlKey && !event.shiftKey && event.key === 'ArrowUp') {
        this.changeMaxHealth(1);
        event.preventDefault();
      } else if (!event.ctrlKey && !event.shiftKey && event.key === 'ArrowDown') {
        this.changeMaxHealth(-1);
        event.preventDefault();
      } else if (!event.ctrlKey && event.key.toLowerCase() === 'b') {
        this.changeBless(event.shiftKey ? -1 : 1);
        event.preventDefault();
      } else if (!event.ctrlKey && event.key.toLowerCase() === 'c') {
        this.changeCurse(event.shiftKey ? -1 : 1);
        event.preventDefault();
      } else if (!event.ctrlKey && !event.shiftKey && (event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'd')) {
        if (this.data.entity instanceof Character) {
          this.toggleExhausted();
        } else {
          this.toggleDead();
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  changeHealth(value: number) {
    this.health += value;
    if (this.data.entity) {
      if (this.data.entity.health + this.health > EntityValueFunction(this.data.entity.maxHealth)) {
        this.health = EntityValueFunction(this.data.entity.maxHealth) - this.data.entity.health;
      }
    }
  }

  changeExperience(value: number) {
    if (this.data.entity instanceof Character) {
      this.experience += value;
      if (this.data.entity.experience + this.experience <= 0) {
        this.experience = -this.data.entity.experience;
      }
    }
  }

  changeCharacterToken(value: number, index: number = -1) {
    if (this.data.entity instanceof Character) {
      if (index < 0) {
        this.characterToken += value;
        if (this.data.entity.token + this.characterToken <= 0) {
          this.characterToken = -this.data.entity.token;
        }
      } else {
        this.characterTokenValues[index] += value;
        if (this.data.entity.tokenValues[index] + this.characterTokenValues[index] <= 0) {
          this.characterTokenValues[index] = -this.data.entity.tokenValues[index];
        }
      }
    }
  }

  changeLoot(value: number) {
    if (this.data.entity instanceof Character) {
      this.loot += value;
      if (this.data.entity.loot + this.loot <= 0) {
        this.loot = -this.data.entity.loot;
      }
    }
  }

  attackModifierDeck(): AttackModifierDeck {
    return gameManager.attackModifierManager.byFigure(this.data.figure);
  }

  beforeAttackModifierDeck(change: AttackModiferDeckChange) {
    gameManager.stateManager.before("updateAttackModifierDeck." + change.type, this.data.figure instanceof Character ? "data.character." + this.data.figure.name : (this.data.figure instanceof Monster && (this.data.figure.isAlly || this.data.figure.isAllied) ? 'ally' : 'monster'), ...change.values);
  }

  afterAttackModifierDeck(change: AttackModiferDeckChange) {
    this.attackModifierDeck().merge(change.deck);
    gameManager.stateManager.after();
  }

  countAttackModifier(type: AttackModifierType): number {
    return this.attackModifierDeck().cards.filter((attackModifier) => {
      return attackModifier.type == type;
    }).length;
  }

  countUpcomingAttackModifier(type: AttackModifierType): number {
    return this.attackModifierDeck().cards.filter((attackModifier, index) => {
      return attackModifier.type == type && index > this.attackModifierDeck().current;
    }).length;
  }

  countDrawnAttackModifier(type: AttackModifierType): number {
    return this.attackModifierDeck().cards.filter((attackModifier, index) => {
      return attackModifier.type == type && index <= this.attackModifierDeck().current;
    }).length;
  }

  changeAttackModifier(type: AttackModifierType, value: number) {
    if (value > 0) {
      if (type == AttackModifierType.bless && gameManager.attackModifierManager.countUpcomingBlesses() >= 10) {
        return;
      } else if (type == AttackModifierType.curse && gameManager.attackModifierManager.countUpcomingCurses(this.data.figure instanceof Monster && !this.data.figure.isAlly && !this.data.figure.isAllied) >= 10) {
        return;
      }
      for (let i = 0; i < value; i++) {
        gameManager.attackModifierManager.addModifier(this.attackModifierDeck(), new AttackModifier(type));
      }
    } else if (value < 0) {
      let card = this.attackModifierDeck().cards.find((attackModifier, index) => {
        return attackModifier.type == type && index > this.attackModifierDeck().current;
      });
      while (card && value < 0) {
        this.attackModifierDeck().cards.splice(this.attackModifierDeck().cards.indexOf(card), 1);
        card = this.attackModifierDeck().cards.find((attackModifier, index) => {
          return attackModifier.type == type && index > this.attackModifierDeck().current;
        });
        value++;
      }
    }
  }

  changeBless(value: number) {
    if (this.data.figure instanceof Character || this.data.figure instanceof Monster) {
      this.bless += value;
      const existing = gameManager.attackModifierManager.countUpcomingBlesses();
      if (this.bless + existing >= 10) {
        this.bless = 10 - existing;
      } else if (this.bless + existing < 0) {
        this.bless = -existing;
      }
    }
  }

  changeCurse(value: number) {
    if (this.data.figure instanceof Character || this.data.figure instanceof Monster) {
      this.curse += value;
      const existing = gameManager.attackModifierManager.countUpcomingCurses(this.data.figure instanceof Monster && !this.data.figure.isAlly && !this.data.figure.isAllied);
      if (this.curse + existing >= 10) {
        this.curse = 10 - existing;
      } else if (this.curse + existing < 0) {
        this.curse = -existing;
      }
    }
  }

  countAdditional(type: AttackModifierType): number {
    if (this.data.figure instanceof Character && this.data.figure.additionalModifier.filter((card) => card.attackModifier.type == type).length > 0) {
      return this.data.figure.additionalModifier.filter((card) => card.attackModifier.type == type).map((card) => card.count || 1).reduce((a, b) => a + b);
    }
    return 0;
  }

  changeEmpower(value: number) {
    if (this.data.figure instanceof Character) {
      this.empower += value;
      const existing = this.countUpcomingAttackModifier(AttackModifierType.empower);
      const count_all = this.countAdditional(AttackModifierType.empower);
      if (this.empower + existing >= count_all) {
        this.empower = count_all - existing;
      } else if (this.empower + existing < 0) {
        this.empower = -existing;
      }
    }
  }

  changeEnfeeble(value: number) {
    if (this.data.figure instanceof Character) {
      this.enfeeble += value;
      const existing = this.countUpcomingAttackModifier(AttackModifierType.enfeeble);
      const count_all = this.countAdditional(AttackModifierType.enfeeble);
      if (this.enfeeble + existing >= count_all) {
        this.enfeeble = count_all - existing;
      } else if (this.enfeeble + existing < 0) {
        this.enfeeble = -existing;
      }
    }
  }

  toggleExhausted() {
    if (this.data.entity instanceof Character || this.data.entity instanceof Objective) {
      if (this.data.entity instanceof Character) {
        gameManager.stateManager.before(this.data.entity.exhausted ? "unsetExhausted" : "setExhausted", "data.character." + this.data.entity.name);
      } else {
        gameManager.stateManager.before(this.data.entity.exhausted ? "unsetObjectiveExhausted" : "setObjectiveExhausted", this.data.entity.title || this.data.entity.name);
      }
      this.exhausted();
      gameManager.stateManager.after();
    }
  }

  exhausted() {
    if (this.data.entity instanceof Character || this.data.entity instanceof Objective) {
      this.data.entity.exhausted = !this.data.entity.exhausted;
      if (this.data.entity.exhausted) {
        this.data.entity.off = true;
        this.data.entity.active = false;
      } else {
        this.data.entity.off = false;
      }
    }
  }

  changeMaxHealth(value: number) {
    this.maxHp += value;
    if (!(this.data.entity instanceof Character) && !(this.data.entity instanceof Objective)) {
      this.health += value;
    }
    if (this.data.entity) {
      if (EntityValueFunction(this.data.entity.maxHealth) + this.maxHp <= 1) {
        this.maxHp = -EntityValueFunction(this.data.entity.maxHealth) + 1;
      }
    }
  }

  setLevel(level: number) {
    if (this.data.entity instanceof Character) {
      gameManager.stateManager.before("setLevel", "data.character." + this.data.entity.name, "" + level);
      gameManager.characterManager.setLevel(this.data.entity, level);
      gameManager.stateManager.after();
    }
  }

  isImmune(conditionName: ConditionName): boolean {
    if (this.data.entity) {
      return gameManager.entityManager.isImmune(this.data.entity, this.data.figure, conditionName);
    }
    return false;
  }

  markers(): string[] {
    if (this.data.entity) {
      return [...gameManager.markers(), ...this.data.entity.markers].filter((marker, index, self) => index == self.indexOf(marker));
    }
    return [];
  }

  hasMarker(marker: string): boolean {
    if (this.data.entity) {
      return gameManager.entityManager.hasMarker(this.data.entity, marker);
    }
    return false;
  }

  toggleCharacterAbsent() {
    if (this.data.entity instanceof Character && (this.data.entity.absent || gameManager.characterManager.characterCount() > 1)) {
      gameManager.stateManager.before(this.data.entity.absent ? "unsetAbsent" : "setAbsent", "data.character." + this.data.entity.name);
      this.data.entity.absent = !this.data.entity.absent;
      if (this.data.entity.absent && this.data.entity.active) {
        gameManager.roundManager.toggleFigure(this.data.entity);
      }
      gameManager.stateManager.after();
    }
  }

  toggleCharacterMarker() {
    if (this.data.entity instanceof Character) {
      gameManager.stateManager.before(this.data.entity.marker ? "disableMarker" : "enableMarker", "data.character." + this.data.entity.name);
      this.data.entity.marker = !this.data.entity.marker;
      gameManager.stateManager.after();
    }
  }

  toggleMarker(marker: string) {
    if (this.data.entity) {
      if (this.data.entity instanceof MonsterEntity) {
        gameManager.stateManager.before(this.hasMarker(marker) ? "removeEntityMarker" : "addEntityMarker", "data.monster." + this.data.figure.name, "" + this.data.entity.number, "data.character." + marker.split('-')[1]);
      } else if (this.data.entity instanceof Character) {
        gameManager.stateManager.before(this.hasMarker(marker) ? "removeMarker" : "addMarker", "data.character." + this.data.entity.name, "data.character." + marker.split('-')[1]);
      } else if (this.data.entity instanceof Summon) {
        gameManager.stateManager.before(this.hasMarker(marker) ? "removeSummonMarker" : "addSummonMarker", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, "data.character." + marker.split('-')[1]);
      } else if (this.data.entity instanceof Objective) {
        gameManager.stateManager.before(this.hasMarker(marker) ? "removeObjectiveMarker" : "addObjectiveMarker", this.data.entity.title || this.data.entity.name, "data.character." + marker.split('-')[1]);
      }

      gameManager.entityManager.toggleMarker(this.data.entity, marker);
      gameManager.stateManager.after();
    }
  }

  toggleSummon() {
    if (this.data.entity instanceof MonsterEntity) {
      let summonState = SummonState.false;
      if (this.data.entity.summon == SummonState.false) {
        summonState = SummonState.new;
      } else if (this.data.entity.summon == SummonState.new) {
        summonState = SummonState.true;
      }

      gameManager.stateManager.before("setEntitySummonState", "data.monster." + this.data.figure.name, "monster." + this.data.entity.type, "" + this.data.entity.number, 'summon.state.' + summonState);
      this.data.entity.summon = summonState;
      gameManager.stateManager.after();
    }
  }

  changeMonsterEntity() {
    if (this.data.figure instanceof Monster && this.data.entity instanceof MonsterEntity) {
      if (gameManager.monsterManager.monsterStandeeMax(this.data.figure) > 1 || this.data.entity.type != MonsterType.boss) {
        this.close();
        this.dialog.open(MonsterNumberPickerDialog, {
          panelClass: 'dialog',
          data: {
            monster: this.data.figure,
            entity: this.data.entity,
            change: true
          },
          positionStrategy: this.overlay.position().flexibleConnectedTo(this.data.positionElement).withPositions(ghsDefaultDialogPositions())
        })
        this.dialogRef.close();
      }
    }
  }


  toggleDead() {
    if (this.data.entity instanceof MonsterEntity) {
      this.dead();
    } else if (this.data.entity instanceof Summon) {
      this.dead();
    } else if (this.data.entity instanceof Objective) {
      this.dead();
    }
  }

  dead() {
    if (this.data.figure instanceof Monster && this.data.entity instanceof MonsterEntity) {
      gameManager.stateManager.before("entityDead", "data.monster." + this.data.figure.name, "monster." + this.data.entity.type, "" + this.data.entity.number);
      this.data.entity.dead = true;

      if (this.data.figure.entities.every((monsterEntity) => monsterEntity.dead)) {
        if (this.data.figure.active) {
          gameManager.roundManager.toggleFigure(this.data.figure);
        }
      }

      setTimeout(() => {
        if (this.data.figure instanceof Monster && this.data.entity instanceof MonsterEntity) {
          gameManager.monsterManager.removeMonsterEntity(this.data.figure, this.data.entity);
          gameManager.stateManager.after();
        }
      }, settingsManager.settings.disableAnimations ? 0 : 1500);
    } else if (this.data.figure instanceof Character && this.data.entity instanceof Summon) {
      gameManager.stateManager.before("summonDead", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name);
      this.data.entity.dead = true;
      setTimeout(() => {
        if (this.data.figure instanceof Character && this.data.entity instanceof Summon) {
          gameManager.characterManager.removeSummon(this.data.figure, this.data.entity);
          gameManager.stateManager.after();
        }
      }, settingsManager.settings.disableAnimations ? 0 : 1500);
    } else if (this.data.entity instanceof Objective) {
      gameManager.stateManager.before("removeObjective", this.data.entity.title || this.data.entity.name);
      gameManager.characterManager.removeObjective(this.data.entity);
      gameManager.stateManager.after();
    }
    this.dialogRef.close(true);
  }

  changeAttack(value: number) {
    if (this.data.entity instanceof Summon) {
      this.attack += value;
      if (typeof this.data.entity.attack == 'number' && this.data.entity.attack + this.attack < 0) {
        this.attack = -this.data.entity.attack;
      }
    }
  }

  changeMovement(value: number) {
    if (this.data.entity instanceof Summon) {
      this.movement += value;
      if (this.data.entity.movement + this.movement <= 0) {
        this.movement = -this.data.entity.movement;
      }
    }
  }

  changeRange(value: number) {
    if (this.data.entity instanceof Summon) {
      this.range += value;
      if (this.data.entity.range + this.range <= 0) {
        this.range = -this.data.entity.range;
      }
    }
  }

  toggleSummonStatus() {
    if (this.data.entity instanceof Summon) {
      let state = SummonState.new;
      if (this.data.entity.state == SummonState.new) {
        state = SummonState.true;
      }
      gameManager.stateManager.before("setSummonState", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, 'summon.state.' + state);
      this.data.entity.state = state;
      gameManager.stateManager.after();
    }
  }

  changeId(value: number) {
    if (this.data.entity instanceof Objective) {
      this.id = ghsModulo(this.id + value, 12);

      if (gameManager.game.figures.filter((figure) => figure instanceof Objective).length < 12) {
        while (gameManager.game.figures.some((figure) => figure instanceof Objective && figure.id == this.id)) {
          this.id = ghsModulo(this.id + value, 12);
        }
      }
    }
  }

  changeMarker(value: number) {
    if (this.data.entity instanceof Objective) {
      this.marker = ghsModulo(this.marker + value, OBJECTIV_MARKERS.length);
    }
  }

  openLevelDialog() {
    this.levelDialog = true;
    this.changeDetectorRef.detectChanges();
    if (this.data.entity instanceof Character) {

      if (this.characterTitleInput) {
        this.characterTitleInput.nativeElement.value = this.data.entity.title || settingsManager.getLabel('data.character.' + this.data.entity.name.toLowerCase());
      }

      this.titles = [];
      if (this.data.entity.identities && this.data.entity.identities.length > 1 && settingsManager.settings.characterIdentities) {
        this.titles = this.data.entity.title.split('|');
        if (this.titles.length < this.data.entity.identities.length) {
          for (let i = this.titles.length; i < this.data.entity.identities.length; i++) {
            this.titles.push('');
          }
        }
        for (let i = 0; i < this.titles.length; i++) {
          if (!this.titles[i]) {
            this.titles[i] = settingsManager.getLabel('data.character.' + this.data.entity.name.toLowerCase());
          }
        }
      }
    }
    if (this.data.entity instanceof Summon) {
      this.summonTitleInput.nativeElement.value = this.data.entity.title || settingsManager.getLabel('data.summon.' + this.data.entity.name.toLowerCase());
    }
  }



  setTitle(event: any, index: number) {
    this.titles[index] = event.target.value;
  }

  close(): void {
    this.closeConditions();
    if (this.data.entity instanceof Character) {
      this.closeCharacter();
    } else if (this.data.figure instanceof Monster) {
      this.closeMonster();
    } else if (this.data.entity instanceof Summon) {
      this.closeSummon();
    } else if (this.data.entity instanceof Objective) {
      this.closeObjective();
    }
  }

  closeCharacter(): void {
    if (this.data.entity instanceof Character) {
      if (this.maxHp) {
        gameManager.stateManager.before("changeMaxHP", "data.character." + this.data.entity.name, ghsValueSign(this.maxHp));
        if (this.data.entity.maxHealth + this.maxHp < this.data.entity.maxHealth || this.data.entity.health == this.data.entity.maxHealth) {
          this.data.entity.health = this.data.entity.maxHealth + this.maxHp;
        }
        this.data.entity.maxHealth += this.maxHp;
        gameManager.stateManager.after();
        this.maxHp = 0;
      }

      if (this.health != 0) {
        gameManager.stateManager.before("changeHP", "data.character." + this.data.entity.name, ghsValueSign(this.health));
        gameManager.entityManager.changeHealth(this.data.entity, this.health);
        this.health = 0;
        gameManager.stateManager.after();
      }

      if (this.experience != 0) {
        gameManager.stateManager.before("changeXP", "data.character." + this.data.entity.name, ghsValueSign(this.experience));
        this.data.entity.experience += this.experience;
        if (this.data.entity.experience < 0) {
          this.data.entity.experience = 0;
        }
        this.experience = 0;
        gameManager.stateManager.after();
      }

      if (this.characterToken != this.data.entity.token) {
        gameManager.stateManager.before("setCharacterToken", "data.character." + this.data.entity.name, '' + this.characterToken);
        this.data.entity.token = this.characterToken;
        if (this.data.entity.token < 0) {
          this.data.entity.token = 0;
        }
        this.characterToken = 0;
        gameManager.stateManager.after();
      }

      for (let index = 0; index < this.data.entity.tokens.length; index++) {
        if (this.characterTokenValues[index] != this.data.entity.tokenValues[index]) {
          gameManager.stateManager.before("setCharacterTokenValue", "data.character." + this.data.entity.name, this.data.entity.tokens[index], '' + this.characterTokenValues[index]);
          this.data.entity.tokenValues[index] = this.characterTokenValues[index];
          if (this.data.entity.tokenValues[index] < 0) {
            this.data.entity.tokenValues[index] = 0;
          }
          this.characterTokenValues[index] = 0;
          gameManager.stateManager.after();
        }
      }

      if (this.loot != 0) {
        gameManager.stateManager.before("changeLoot", "data.character." + this.data.entity.name, ghsValueSign(this.loot));
        this.data.entity.loot += this.loot;
        if (this.data.entity.loot < 0) {
          this.data.entity.loot = 0;
        }
        this.loot = 0;
        gameManager.stateManager.after();
      }

      if (this.bless != 0) {
        gameManager.stateManager.before(this.bless < 0 ? "removeBless" + (this.bless < -1 ? 'es' : '') : "addBless" + (this.bless > 1 ? 'es' : ''), "data.character." + this.data.figure.name, '' + (this.bless > 0 ? this.bless : this.bless * -1));
        this.changeAttackModifier(AttackModifierType.bless, this.bless);
        gameManager.stateManager.after();
        this.bless = 0;
      }

      if (this.curse != 0) {
        gameManager.stateManager.before(this.curse < 0 ? "removeCurse" + (this.curse < -1 ? 's' : '') : "addCurse" + (this.curse > 1 ? 's' : ''), "data.character." + this.data.figure.name, '' + (this.curse > 0 ? this.curse : this.curse * -1));
        this.changeAttackModifier(AttackModifierType.curse, this.curse);
        gameManager.stateManager.after();
        this.curse = 0;
      }

      if (this.empower != 0) {
        gameManager.stateManager.before(this.empower < 0 ? "removeEmpower" + (this.empower < -1 ? 's' : '') : "addEmpower" + (this.empower > 1 ? 's' : ''), "data.character." + this.data.figure.name, '' + (this.empower > 0 ? this.empower : this.empower * -1));
        if (this.empower > 0) {
          const additional = gameManager.attackModifierManager.getAdditional(this.data.entity, AttackModifierType.empower);
          for (let i = 0; i < Math.min(this.empower, additional.length); i++) {
            gameManager.attackModifierManager.addModifier(this.data.entity.attackModifierDeck, additional[i]);
          }
        } else {
          for (let i = 0; i < this.empower * -1; i++) {
            const empower = this.data.entity.attackModifierDeck.cards.find((am, index) => index > (this.data.entity as Character).attackModifierDeck.current && am.type == AttackModifierType.empower);
            if (empower) {
              this.data.entity.attackModifierDeck.cards.splice(this.data.entity.attackModifierDeck.cards.indexOf(empower), 1);
            }
          }
        }
        gameManager.stateManager.after();
        this.empower = 0;
      }

      if (this.enfeeble != 0) {
        gameManager.stateManager.before(this.enfeeble < 0 ? "removeEnfeeble" + (this.enfeeble < -1 ? 's' : '') : "addEnfeeble" + (this.enfeeble > 1 ? 's' : ''), "data.character." + this.data.figure.name, '' + (this.enfeeble > 0 ? this.enfeeble : this.enfeeble * -1));
        if (this.enfeeble > 0) {
          const additional = gameManager.attackModifierManager.getAdditional(this.data.entity, AttackModifierType.enfeeble);
          for (let i = 0; i < Math.min(this.enfeeble, additional.length); i++) {
            gameManager.attackModifierManager.addModifier(this.data.entity.attackModifierDeck, additional[i]);
          }
        } else {
          for (let i = 0; i < this.enfeeble * -1; i++) {
            const enfeeble = this.data.entity.attackModifierDeck.cards.find((am, index) => index > (this.data.entity as Character).attackModifierDeck.current && am.type == AttackModifierType.enfeeble);
            if (enfeeble) {
              this.data.entity.attackModifierDeck.cards.splice(this.data.entity.attackModifierDeck.cards.indexOf(enfeeble), 1);
            }
          }
        }
        gameManager.stateManager.after();
        this.enfeeble = 0;
      }

      let title = this.data.entity.title;

      if (this.characterTitleInput) {
        title = this.characterTitleInput.nativeElement.value;
      }

      if (this.titles.length > 0) {
        for (let i = 0; i < this.titles.length; i++) {
          if (this.titles[i] == settingsManager.getLabel('data.character.' + this.data.entity.name.toLowerCase())) {
            this.titles[i] = '';
          }
        }

        title = this.titles.join('|');
        while (title.endsWith('|')) {
          title = title.substring(0, title.length - 1);
        }
      }

      if (title != settingsManager.getLabel('data.character.' + this.data.entity.name.toLowerCase())) {
        if (this.data.entity.title != title) {
          gameManager.stateManager.before("setTitle", "data.character." + this.data.entity.name, title);
          this.data.entity.title = title;
          gameManager.stateManager.after();
        }
      } else if (this.data.entity.title != "") {
        gameManager.stateManager.before("unsetTitle", "data.character." + this.data.entity.name, this.data.entity.title);
        this.data.entity.title = "";
        gameManager.stateManager.after();
      }
    }
  }

  closeMonster() {
    if (this.data.figure instanceof Monster) {
      if (this.bless != 0) {
        if (this.data.entity instanceof MonsterEntity) {
          gameManager.stateManager.before(this.bless < 0 ? "removeEntityBless" + (this.bless < -1 ? 'es' : '') : "addEntityBless" + (this.bless > 1 ? 'es' : ''), "data.monster." + this.data.figure.name, "monster." + this.data.entity.type, "" + this.data.entity.number, '' + (this.bless > 0 ? this.bless : this.bless * -1));
        } else {
          gameManager.stateManager.before(this.bless < 0 ? "removeBless" + (this.bless < -1 ? 'es' : '') : "addBless" + (this.bless > 1 ? 'es' : ''), "data.monster." + this.data.figure.name, '' + (this.bless > 0 ? this.bless : this.bless * -1));
        }
        this.changeAttackModifier(AttackModifierType.bless, this.bless);
        gameManager.stateManager.after();
        this.bless = 0;
      }

      if (this.curse != 0) {
        if (this.data.entity instanceof MonsterEntity) {
          gameManager.stateManager.before(this.curse < 0 ? "removeEntityCurse" + (this.curse < -1 ? 's' : '') : "addEntityCurse" + (this.curse > 1 ? 's' : ''), "data.monster." + this.data.figure.name, "monster." + this.data.entity.type, "" + this.data.entity.number, '' + (this.curse > 0 ? this.curse : this.curse * -1));
        } else {
          gameManager.stateManager.before(this.curse < 0 ? "removeCurse" + (this.curse < -1 ? 's' : '') : "addCurse" + (this.curse > 1 ? 's' : ''), "data.monster." + this.data.figure.name, '' + (this.curse > 0 ? this.curse : this.curse * -1));
        }
        this.changeAttackModifier(AttackModifierType.curse, this.curse);
        gameManager.stateManager.after();
        this.curse = 0;
      }

      if (this.data.entity instanceof MonsterEntity) {
        if (this.maxHp) {
          gameManager.stateManager.before("changeEntityMaxHp", "data.monster." + this.data.figure.name, "monster." + this.data.entity.type, "" + this.data.entity.number, ghsValueSign(this.maxHp));
          this.data.entity.maxHealth += this.maxHp;
          gameManager.stateManager.after();
          this.maxHp = 0;
        }

        if (this.health != 0) {
          gameManager.stateManager.before("changeEntityHp", "data.monster." + this.data.figure.name, "monster." + this.data.entity.type, "" + this.data.entity.number, ghsValueSign(this.health));
          gameManager.entityManager.changeHealth(this.data.entity, this.health);
          gameManager.stateManager.after();
          this.health = 0;
        }

        if ((this.data.entity.maxHealth > 0 && this.data.entity.health <= 0 || this.data.entity.dead) && (this.data.entity.entityConditions.length == 0 || this.data.entity.entityConditions.every((entityCondition) => !entityCondition.highlight && entityCondition.types.indexOf(ConditionType.turn) == -1 && entityCondition.types.indexOf(ConditionType.apply) == -1))) {
          this.dead();
        }
      }
    }
  }

  closeSummon() {
    if (this.data.figure instanceof Character && this.data.entity instanceof Summon) {
      if (this.data.entity.init) {
        gameManager.characterManager.removeSummon(this.data.figure, this.data.entity);
        gameManager.stateManager.before("addSummon", "data.character." + this.data.figure.name, this.data.entity.name);
        this.data.entity.init = false;
        if (this.health != 0) {
          gameManager.entityManager.changeHealth(this.data.entity, this.health);
        }
        if (this.attack != 0 && typeof this.data.entity.attack == 'number') {
          this.data.entity.attack += this.attack;
        }
        if (this.movement != 0) {
          this.data.entity.movement += this.movement;
        }
        if (this.range != 0) {
          this.data.entity.range += this.range;
        }
        if (this.maxHp) {
          if (this.data.entity.maxHealth + this.maxHp < this.data.entity.maxHealth || this.data.entity.health == this.data.entity.maxHealth) {
            this.data.entity.health = this.data.entity.maxHealth + this.maxHp;
          }
          this.data.entity.maxHealth += this.maxHp;
        }
        gameManager.characterManager.addSummon(this.data.figure, this.data.entity);
        gameManager.stateManager.after();
      } else {
        if (this.maxHp) {
          gameManager.stateManager.before("changeSummonMaxHp", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, ghsValueSign(this.maxHp));
          this.data.entity.maxHealth += this.maxHp;
          gameManager.stateManager.after();
        }
        if (this.health != 0) {
          gameManager.stateManager.before("changeSummonHp", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, ghsValueSign(this.health));
          gameManager.entityManager.changeHealth(this.data.entity, this.health);
          gameManager.stateManager.after();
        }
        if (this.attack != 0 && typeof this.data.entity.attack == 'number') {
          gameManager.stateManager.before("changeSummonAttack", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, ghsValueSign(this.attack));
          this.data.entity.attack += this.attack;
          gameManager.stateManager.after();
        }
        if (this.movement != 0) {
          gameManager.stateManager.before("changeSummonMove", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, ghsValueSign(this.movement));
          this.data.entity.movement += this.movement;
          gameManager.stateManager.after();
        }
        if (this.range != 0) {
          gameManager.stateManager.before("changeSummonRange", "data.character." + this.data.figure.name, "data.summon." + this.data.entity.name, ghsValueSign(this.range));
          this.data.entity.range += this.range;
          gameManager.stateManager.after();
        }
      }

      if (this.summonTitleInput) {
        if (this.summonTitleInput.nativeElement.value && this.summonTitleInput.nativeElement.value != this.data.entity.name) {
          if (this.data.entity.title != this.summonTitleInput.nativeElement.value) {
            gameManager.stateManager.before("setTitle", this.data.entity.name, this.summonTitleInput.nativeElement.value);
            this.data.entity.title = this.summonTitleInput.nativeElement.value;
            gameManager.stateManager.after();
          }
        } else if (this.data.entity.title != "") {
          gameManager.stateManager.before("unsetTitle", 'data.summon.' + this.data.entity.name, this.data.entity.title);
          this.data.entity.title = "";
          gameManager.stateManager.after();
        }
      }

      if ((this.data.entity.health <= 0 || this.data.entity.dead) && (this.data.entity.entityConditions.length == 0 || this.data.entity.entityConditions.every((entityCondition) => !entityCondition.highlight && entityCondition.types.indexOf(ConditionType.turn) == -1 && entityCondition.types.indexOf(ConditionType.apply) == -1))) {
        this.dead();
      }
    }
  }

  showMaxHealth(): boolean {
    if (this.data.entity instanceof Objective) {
      return !isNaN(+this.data.entity.maxHealth) && EntityValueFunction(this.data.entity.maxHealth) > 0;
    }
    return false;
  }

  closeObjective() {
    if (this.data.entity instanceof Objective) {
      if (this.maxHp) {
        gameManager.stateManager.before("changeObjectiveMaxHp", this.data.entity.title || this.data.entity.name || this.data.entity.escort ? 'escort' : 'objective', ghsValueSign(this.maxHp));
        if (+this.data.entity.maxHealth + this.maxHp < EntityValueFunction(this.data.entity.maxHealth) || this.data.entity.health == EntityValueFunction(this.data.entity.maxHealth)) {
          this.data.entity.health = +this.data.entity.maxHealth + this.maxHp;
        }
        this.data.entity.maxHealth = +this.data.entity.maxHealth + this.maxHp;
        gameManager.stateManager.after();
      }

      if (this.health != 0) {
        gameManager.stateManager.before("changeHP", this.data.entity.title || this.data.entity.name || this.data.entity.escort ? 'escort' : 'objective', ghsValueSign(this.health));
        gameManager.entityManager.changeHealth(this.data.entity, this.health);
        if (this.data.entity.health <= 0 || this.data.entity.exhausted && this.health >= 0 && this.data.entity.health > 0) {
          if (this.data.entity.escort) {
            this.exhausted();
          } else {
            gameManager.characterManager.removeObjective(this.data.entity);
          }
        }
        gameManager.stateManager.after();
        this.health = 0;
      }

      const newId = ghsModulo(this.id + this.data.entity.id, 12);
      if (newId != this.data.entity.id) {
        gameManager.stateManager.before("changeObjectiveId", this.data.entity.title || this.data.entity.name || this.data.entity.escort ? 'escort' : 'objective', "" + (newId + 1));
        this.data.entity.id = newId;
        gameManager.stateManager.after();
      }
      this.id = 0;

      if (!this.data.entity.marker) {
        this.data.entity.marker = "";
      }

      const newMarker = OBJECTIV_MARKERS[ghsModulo(this.marker + OBJECTIV_MARKERS.indexOf(this.data.entity.marker), OBJECTIV_MARKERS.length)];

      if (newMarker != this.data.entity.marker) {
        gameManager.stateManager.before("changeObjectiveMarker", this.data.entity.title || this.data.entity.name || this.data.entity.escort ? 'escort' : 'objective', newMarker);
        this.data.entity.marker = newMarker;
        gameManager.stateManager.after();
      }
      this.marker = 0;

      if (this.objectiveTitleInput) {
        if (this.objectiveTitleInput.nativeElement.value && this.objectiveTitleInput.nativeElement.value != this.data.entity.name) {
          if (this.data.entity.title != this.objectiveTitleInput.nativeElement.value) {
            gameManager.stateManager.before("setTitle", this.data.entity.name, this.objectiveTitleInput.nativeElement.value);
            this.data.entity.title = this.objectiveTitleInput.nativeElement.value;
            gameManager.stateManager.after();
          }
        } else if (this.data.entity.title != "") {
          gameManager.stateManager.before("unsetTitle", this.data.entity.name || this.data.entity.escort ? 'escort' : 'objective', this.data.entity.title);
          this.data.entity.title = "";
          gameManager.stateManager.after();
        }
      }
    }
  }

  closeConditions() {
    if (this.data.entity) {
      this.entityConditions.filter((entityCondition) => entityCondition.state == EntityConditionState.new || entityCondition.state == EntityConditionState.removed).forEach((entityCondition) => {
        if (this.data.entity && (entityCondition.state == EntityConditionState.new || gameManager.entityManager.hasCondition(this.data.entity, entityCondition))) {
          if (this.data.entity instanceof Character && entityCondition.name == ConditionName.muddle && entityCondition.state == EntityConditionState.new &&
            this.data.entity.progress.equippedItems.find((identifier) => identifier.edition == 'gh' && identifier.name == '108')) {
            entityCondition.name = ConditionName.strengthen;
          }

          entityCondition.expired = entityCondition.state == EntityConditionState.new;
          gameManager.stateManager.before(...gameManager.entityManager.undoInfos(this.data.entity, this.data.figure, entityCondition.state == EntityConditionState.removed ? "removeCondition" : "addCondition"), "game.condition." + entityCondition.name, this.data.entity instanceof MonsterEntity ? 'monster.' + this.data.entity.type + ' ' : '');
          if (entityCondition.state == EntityConditionState.removed) {
            gameManager.entityManager.removeCondition(this.data.entity, entityCondition);
          } else {
            gameManager.entityManager.addCondition(this.data.entity, entityCondition, this.data.figure.active, this.data.figure.off, entityCondition.permanent);
          }
          gameManager.stateManager.after();
        }
      })

      this.entityConditions.forEach((condition) => {
        if (this.data.entity) {
          const entityCondition = this.data.entity.entityConditions.find((entityCondition) => entityCondition.name == condition.name && !entityCondition.expired);
          if (entityCondition && entityCondition.value != condition.value) {
            gameManager.stateManager.before(...gameManager.entityManager.undoInfos(this.data.entity, this.data.figure, "setConditionValue"), "game.condition." + condition.name, "" + condition.value, this.data.entity instanceof MonsterEntity ? 'monster.' + (this.data.entity as MonsterEntity).type + ' ' : '');
            entityCondition.value = condition.value;
            gameManager.stateManager.after();
          }
        }
      })
    }
  }

}
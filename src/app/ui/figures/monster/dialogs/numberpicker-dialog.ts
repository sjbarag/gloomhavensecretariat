import { DialogRef, DIALOG_DATA } from "@angular/cdk/dialog";
import { Component, Inject, OnInit } from "@angular/core";
import { GameManager, gameManager } from "src/app/game/businesslogic/GameManager";
import { SettingsManager, settingsManager } from "src/app/game/businesslogic/SettingsManager";
import { EntityValueFunction } from "src/app/game/model/Entity";
import { GameState } from "src/app/game/model/Game";
import { Monster } from "src/app/game/model/Monster";
import { MonsterEntity } from "src/app/game/model/MonsterEntity";
import { MonsterType } from "src/app/game/model/data/MonsterType";


@Component({
    selector: 'ghs-monster-numberpicker-dialog',
    templateUrl: 'numberpicker-dialog.html',
    styleUrls: ['./numberpicker-dialog.scss']
})
export class MonsterNumberPickerDialog implements OnInit {

    monster: Monster;
    type: MonsterType;
    max: number;
    range: number[];
    summon: boolean = false;
    MonsterType = MonsterType;
    entity: MonsterEntity | undefined;
    entities: MonsterEntity[] | undefined;
    automatic: boolean = false;
    change: boolean = false;
    settingsManager: SettingsManager = settingsManager;

    gameManager: GameManager = gameManager;

    constructor(@Inject(DIALOG_DATA) data: { monster: Monster, type: MonsterType, range: number[], entity: MonsterEntity | undefined, entities: MonsterEntity[] | undefined, automatic: boolean, change: boolean }, private dialogRef: DialogRef) {
        this.monster = data.monster;
        this.type = data.type;
        this.max = gameManager.monsterManager.monsterStandeeMax(this.monster);
        this.range = data.range;
        this.entity = data.entity;
        this.entities = data.entities;
        this.automatic = data.automatic || false;
        this.change = data.change || false;
        if (!this.entity) {
            this.entity = this.entities && this.entities.find((entity) => entity.number < 0) || undefined;
        }
        if (this.entity) {
            this.type = this.entity.type;
        }
    }

    ngOnInit(): void {
        this.range = Array.from(Array(this.max).keys()).map(x => x + 1);
    }

    hasEntity(): boolean {
        return this.monster.entities.filter((monsterEntity) => gameManager.entityManager.isAlive(monsterEntity) && (!settingsManager.settings.hideStats || monsterEntity.type == this.type)).length > 0;
    }

    hasNumber(number: number): boolean {
        return gameManager.monsterManager.monsterStandeeUsed(this.monster, number) != undefined;
    }

    entitiesLeft(): number {
        return this.entities && this.entities.filter((entity) => entity.type == this.type && entity.number < 1).length || 0;
    }

    randomStandee() {
        const count = EntityValueFunction(this.monster.standeeCount || this.monster.count, this.monster.level);
        let number = Math.floor(Math.random() * count) + 1;
        while (this.monster.entities.some((monsterEntity) => monsterEntity.number == number)) {
            number = Math.floor(Math.random() * count) + 1;
        }
        this.pickNumber(number, true, false);
    }

    nextStandee() {
        let number = 1;
        while (this.monster.entities.some((monsterEntity) => monsterEntity.number == number)) {
            number += 1;
        }
        this.pickNumber(number, true, true);
    }

    pickNumber(number: number, automatic: boolean = false, next: boolean = false) {
        if (!this.hasNumber(number) && this.type && !this.change) {
            let undoType = "addStandee";
            if (automatic && !next) {
                undoType = "addRandomStandee";
            } else if (automatic) {
                undoType = "addNextStandee";
            }
            gameManager.stateManager.before(undoType, "data.monster." + this.monster.name, "monster." + this.type, "" + number);
            const dead = this.monster.entities.find((monsterEntity) => monsterEntity.number == number);
            if (dead) {
                gameManager.monsterManager.removeMonsterEntity(this.monster, dead);
            }
            if (this.entity) {
                this.entity.number = number;
                this.entity = this.entities && (this.entities.find((entity) => entity.number < 0 && entity.type == this.type) || this.entities.find((entity) => entity.number < 0)) || undefined;
                if (this.entity) {
                    this.type = this.entity.type;
                }
            } else {
                const entity = gameManager.monsterManager.addMonsterEntity(this.monster, number, this.type, this.summon);

                if (gameManager.game.state == GameState.next && entity) {
                    this.monster.active = !gameManager.game.figures.some((figure) => figure.active);
                    if (this.monster.active) {
                        gameManager.sortFigures(this.monster);
                        entity.active = true;
                    }
                }
            }
            gameManager.stateManager.after();
            if ((this.entities ? this.monster.entities.filter((entity) => entity.number > 0).length : gameManager.entityManager.entities(this.monster).length) == EntityValueFunction(this.monster.count, this.monster.level) || !this.entity && this.entities) {
                this.dialogRef.close();
            } else if (this.entity && this.entities && this.monster.entities.filter((entity) => entity.number > 0).length == EntityValueFunction(this.monster.count, this.monster.level) - 1) {
                this.nextStandee();
            }
        } else if (this.change && this.entity && this.entity.number != number) {
            gameManager.stateManager.before("updateStandee", "data.monster." + this.monster.name, "monster." + this.entity.type, "" + number);
            let existing = gameManager.monsterManager.monsterStandeeUsed(this.monster, number);
            if (existing) {
                let otherNumber = -1;
                while (gameManager.monsterManager.monsterStandeeUsed(this.monster, otherNumber)) {
                    otherNumber -= 1;
                }
                existing.number = otherNumber;
            }
            this.entity.number = number;
            gameManager.stateManager.after();
        }
    }

    toggleMonsterType() {
        if (this.entity && (this.entity.type == MonsterType.normal || this.entity.type == MonsterType.elite)) {
            const normalStat = this.monster.stats.find((stat) => {
                return stat.level == this.monster.level && stat.type == MonsterType.normal;
            });
            const eliteStat = this.monster.stats.find((stat) => {
                return stat.level == this.monster.level && stat.type == MonsterType.elite;
            });
            if (normalStat && eliteStat) {
                gameManager.stateManager.before("changeMonsterType", "data.monster." + this.monster.name, "monster." + this.entity.type, "" + this.entity.number, this.entity.type == MonsterType.normal ? MonsterType.elite : MonsterType.normal);
                this.entity.type = this.entity.type == MonsterType.normal ? MonsterType.elite : MonsterType.normal;
                this.entity.maxHealth = EntityValueFunction(this.entity.type == MonsterType.normal ? normalStat.health : eliteStat.health, this.monster.level)
                if (this.entity.health > this.entity.maxHealth) {
                    this.entity.health = this.entity.maxHealth;
                } else if (this.entity.health < this.entity.maxHealth && this.entity.health == EntityValueFunction(this.entity.type == MonsterType.normal ? eliteStat.health : normalStat.health, this.monster.level)) {
                    this.entity.health = this.entity.maxHealth;
                }
                gameManager.stateManager.after();
            } else {
                console.warn("Missing stats!", this.monster);
            }
        }
    }

    close() {
        this.dialogRef.close(true);
    }
}
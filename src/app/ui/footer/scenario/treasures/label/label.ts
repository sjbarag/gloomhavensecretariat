import { Component, Input, OnInit, ViewEncapsulation } from "@angular/core";
import { gameManager } from "src/app/game/businesslogic/GameManager";
import { TreasureData, TreasureReward } from "src/app/game/model/data/RoomData";

@Component({
    selector: 'ghs-treasure-label',
    templateUrl: './label.html',
    styleUrls: ['./label.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TreasureLabelComponent implements OnInit {

    @Input() treasure: TreasureData | undefined;
    @Input() index!: number;
    @Input() edition!: string;

    labelPrefix = 'game.loot.treasures.rewards.';

    ngOnInit() {
        if (!this.treasure) {
            const editionData = gameManager.editionData.find((editionData) => editionData.edition == this.edition);
            if (editionData && editionData.treasures) {
                const index = this.index - (editionData.treasureOffset || 0);
                if (index >= 0 && index < editionData.treasures.length) {
                    const tresureString = editionData.treasures[index];
                    this.treasure = new TreasureData(tresureString, this.index);
                } else {
                    console.warn("Invalid treasure index: '" + this.index + "' for Edition " + this.edition);
                }
            }
        } else {
            this.index = this.treasure.index;
        }
    }

    rewardLabel(reward: TreasureReward): string[] {
        if (reward.type == "custom") {
            return ['' + reward.value];
        }

        const value = '' + (reward.value || '');

        switch (reward.type) {
            case "gold":
            case "goldFh":
            case "experience":
            case "experienceFh":
            case "battleGoal":
            case "randomScenario":
            case "randomItem":
            case "randomItemDesign":
            case "randomItemBlueprint":
            case "partyAchievement":
            case "campaignSticker":
            case "heal":
            case "loot":
            case "lootCards":
                return [this.labelPrefix + reward.type, value]
            case "damage":
                if (value == "terrain") {
                    return [this.labelPrefix + reward.type, "%game.level.hazardousTerrain%"];
                }
                return [this.labelPrefix + reward.type, "%game.damage:" + value + "%"];
            case "condition":
                const conditions = value.split('+').map((condition) => "%game.condition." + condition + "%");
                let conditionValue = conditions[0];
                if (conditions.length > 1) {
                    conditionValue = conditions.slice(0, - 1).join(',');
                    conditionValue += ' %and% ' + (conditions[conditions.length - 1]);
                }
                return [this.labelPrefix + reward.type, conditionValue];
            case "item":
            case "itemDesign":
                let itemIdValues: string[] = [];
                let itemNameValues: string[] = [];
                value.split('+').forEach((itemString) => {
                    let itemEdition = this.edition;
                    let itemId: number = -1
                    if (isNaN(+itemString)) {
                        itemEdition = itemString.split('-')[0];
                        itemId = +itemString.split('-')[1]
                    } else {
                        itemId = +itemString;
                    }

                    const item = gameManager.item(itemId, itemEdition);

                    if (item) {
                        itemIdValues.push('%game.item% ' + (itemEdition == this.edition ? item.id : item.id + ' [%data.edition.' + item.edition + '%]'));
                        itemNameValues.push('"' + item.name + '"');
                    } else {
                        console.warn("Invalid Item '" + itemId + "' (Edition " + itemEdition + ") on treasure" + this.index + "' for Edition " + this.edition);
                        itemNameValues.push('<img class="icon ghs-svg" src="./assets/images/warning.svg"> %item%')
                    }
                })

                let itemIdValue = itemIdValues[0];
                if (itemIdValues.length > 1) {
                    itemIdValue = itemIdValues.slice(0, - 1).join(',');
                    itemIdValue += ' %and% ' + (itemIdValues[itemIdValues.length - 1]);
                }

                let itemNameValue = itemNameValues[0];
                if (itemNameValues.length > 1) {
                    itemNameValue = itemNameValues.slice(0, - 1).join(',');
                    itemNameValue += ' %and% ' + (itemNameValues[itemNameValues.length - 1]);
                }

                return [this.labelPrefix + reward.type, itemIdValue, itemNameValue];
            case "itemBlueprint":
                const blueprintItem = gameManager.item(+value, this.edition);
                if (blueprintItem) {
                    return [this.labelPrefix + reward.type, value, blueprintItem.name];
                } else {
                    console.warn("Invalid Item '" + value + "' (Edition " + this.edition + ") on treasure" + this.index + "' for Edition " + this.edition);
                    return [this.labelPrefix + reward.type, value, '<img class="icon ghs-svg" src="./assets/images/warning.svg"> %item%'];
                }
                break;
            case "itemFh":
                const itemFh = gameManager.item(+value, this.edition);
                if (itemFh) {
                    return [this.labelPrefix + reward.type, value, itemFh.name];
                } else {
                    console.warn("Invalid Item '" + value + "' (Edition " + this.edition + ") on treasure" + this.index + "' for Edition " + this.edition);
                    return [this.labelPrefix + reward.type, value, '<img class="icon ghs-svg" src="./assets/images/warning.svg"> %item%'];
                }
                break;
            case "scenario":
                const scenarioData = gameManager.scenarioManager.getScenario(value, this.edition, undefined);
                if (scenarioData) {
                    return [this.labelPrefix + reward.type, scenarioData.index, 'data.scenario.' + scenarioData.name];
                } else {
                    console.warn("Invalid Scenario '" + value + "' on treasure " + this.index + "' for Edition " + this.edition);
                    return [this.labelPrefix + reward.type, value, '<img class="icon ghs-svg" src="./assets/images/warning.svg"> %scenario%'];
                }
                break
            case "event":
                const eventType = value.split('-')[0];
                const eventValue = value.split('-')[1]
                return [this.labelPrefix + reward.type + '.' + eventType, '' + eventValue]
            case "resource":
                const resources = value.split('+').map((resource) =>
                    resource.split("-")[1] + '<img class="icon ghs-svg" src="./assets/images/fh/loot/' + resource.split("-")[0] + '.svg">'
                );
                let resourceValue = resources[0];
                if (resources.length > 1) {
                    resourceValue = resources.slice(0, - 1).join(',');
                    resourceValue += ' %and% ' + (resources[resources.length - 1]);
                }
                return [this.labelPrefix + reward.type, resourceValue];
            case "calenderSection":
                if (value.split('-').length > 1) {
                    return [this.labelPrefix + reward.type, value.split('-')[0], value.split('-')[1]];
                }
        }


        return [];
    }

}
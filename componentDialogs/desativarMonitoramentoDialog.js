const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { CardFactory, MessageFactory } = require('botbuilder');

const storage = require('node-persist');
const { Translator } = require('../translator');

const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class DesativarMonitoramentoDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('desativarMonitoramentoDialog');

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.pararMonitoramento.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
        this.translator = new Translator();
    }

    async run(turnContext, accessor, entities) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }

    }

    async pararMonitoramento(step) {

        await storage.init();
        await storage.setItem(step.context._activity.from.id,'0');

        await step.context.sendActivity(await this.translator.t('Modo de monitoramento automático desativado.'));

        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.DesativarMonitoramentoDialog = DesativarMonitoramentoDialog;
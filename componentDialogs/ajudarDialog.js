const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');
const { MessageFactory } = require('botbuilder');

const { Translator } = require('../translator');

const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class AjudarDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('ajudarDialog');

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.ajudarListar.bind(this)
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

    async ajudarListar(step) {      
        
        var resp = ''; 
        if (step.context._activity.channelId === 'alexa') {
            resp = await this.translator.t('Tente falar um dos comandos a seguir, em português, ou comandos similares: Qual o rpm da turbina? Ativar monitoramento. Por que o mancal esta muito quente? Setar valor mínimo da tag PIT-81-004 para 5. Listar sensores rastreados'); 
        } else {
            resp = MessageFactory.suggestedActions(['Qual o rpm da turbina?', 'Ativar monitoramento', 'Por que o mancal esta muito quente?', 'Setar valor mínimo da tag PIT-81-004 para 5', 'Listar sensores rastreados', 'Qual a vida útil da turbina?'], await this.translator.t('Tente um dos comandos abaixo ou comandos similares:'));            
        }        

        await step.context.sendActivity(resp);
        endDialog = true;
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.AjudarDialog = AjudarDialog;
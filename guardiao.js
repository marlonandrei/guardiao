const { ActivityHandler, MessageFactory } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');

const { ConfigurarTagAlertaDialog } = require('./componentDialogs/configurarTagAlertaDialog');
const { ConfigurarTagMinimoDialog } = require('./componentDialogs/configurarTagMinimoDialog');
const { ConfigurarTagMaximoDialog } = require('./componentDialogs/configurarTagMaximoDialog');
const { IdentificarUsuarioFaceDialog } = require('./componentDialogs/identificarUsuarioFaceDialog');
const { ObterValorDialog } = require('./componentDialogs/obterValorDialog');
const { ChecarVidaUtilDialog } = require('./componentDialogs/checarVidaUtilDialog');
const { InformarSensoresDialog } = require('./componentDialogs/informarSensoresDialog');
const { AtivarMonitoramentoDialog } = require('./componentDialogs/ativarMonitoramentoDialog');
const { DesativarMonitoramentoDialog } = require('./componentDialogs/desativarMonitoramentoDialog');
const { AjudarDialog } = require('./componentDialogs/ajudarDialog');
const { AvaliarDialog } = require('./componentDialogs/avaliarDialog');
const { IdiomaDialog } = require('./componentDialogs/idiomaDialog');
const { Translator } = require('./translator');

const storage = require('node-persist');

//Adaptive card - gerado em: https://adaptivecards.io/designer
const { CardFactory } = require('botbuilder');
const cardBemVindo = require('./resources/adaptiveCards/bemvindo');
const cardExemplos = require('./resources/adaptiveCards/exemplos');
const CARDS = [
    cardBemVindo,
    cardExemplos
];

var { isAdmin } = true;

class Guardiao extends ActivityHandler {

    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty("dialogState");

        this.configurarTagAlertaDialog = new ConfigurarTagAlertaDialog(this.conversationState, this.userState);
        this.configurarTagMinimoDialog = new ConfigurarTagMinimoDialog(this.conversationState, this.userState);
        this.configurarTagMaximoDialog = new ConfigurarTagMaximoDialog(this.conversationState, this.userState);
        this.obterValorDialog = new ObterValorDialog(this.conversationState, this.userState);
        this.checarVidaUtilDialog = new ChecarVidaUtilDialog(this.conversationState, this.userState);
        this.informarSensoresDialog = new InformarSensoresDialog(this.conversationState, this.userState);
        this.ativarMonitoramentoDialog = new AtivarMonitoramentoDialog(this.conversationState, this.userState);
        this.desativarMonitoramentoDialog = new DesativarMonitoramentoDialog(this.conversationState, this.userState);
        this.ajudarDialog = new AjudarDialog(this.conversationState, this.userState);
        this.avaliarDialog = new AvaliarDialog(this.conversationState, this.userState);
        this.identificarUsuarioFaceDialog = new IdentificarUsuarioFaceDialog(this.conversationState, this.userState);
        this.idiomaDialog = new IdiomaDialog(this.conversationState, this.userState);
        this.translator = new Translator();

        this.previousIntent = this.conversationState.createProperty("previousIntent");
        this.conversationData = this.conversationState.createProperty('conservationData');

        // MAC - LUIS Integração
        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: process.env.LuisAPIHostName
        }, {
            includeAllIntents: true
            //includeInstanceData: true
        }, true);


        // MAC - QNA Integração
        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAknowledgeBaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaMaker = qnaMaker;

        this.onMessage(async (context, next) => {
            const luisResult = await dispatchRecognizer.recognize(context);
            const intent = LuisRecognizer.topIntent(luisResult);
            const entities = luisResult.entities;

            await this.dispatchToIntentAsync(context, intent, entities);
            await next();
        });

        this.onDialog(async (context, next) => {
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        this.onMembersAdded(async (context, next) => {            
            await this.enviarMensagemBoasVindas(context);
            await next();
        });
    }

    async enviarMensagemBoasVindas(turnContext) { 
        const members = turnContext.activity.membersAdded;
        const { activity } = turnContext;

        for (var idx = 0; idx < members.length; idx++) {
            
            //console.log(members[idx].id + " - " + turnContext.activity.recipient.id); 
            //console.log(turnContext._activity.channelId);
           
            // MAC - Workaround for webchat :|
            if (((turnContext._activity.channelId === 'webchat') && (members[idx].id === turnContext.activity.recipient.id)) ||
                ((turnContext._activity.channelId !== 'webchat') && (members[idx].id !== turnContext.activity.recipient.id))) {

                if (turnContext._activity.channelId.toLowerCase() != 'alexa') {
                    
                    const bemvindoMensagem = `Bem vindo(a) ao Guardião.`;
                    const card = CardFactory.heroCard(
                        await this.translator.t(bemvindoMensagem),
                        CardFactory.images(['https://www.micrologi.com.br/libras/?texto=bem_vindo']),
                    );
    
                    await turnContext.sendActivity({
                        attachments: [
                            card,
                            CardFactory.adaptiveCard(CARDS[0])
                            //CardFactory.adaptiveCard(CARDS[1])
                        ]
                    });

                    await turnContext.sendActivity(await this.translator.t('Olá prazer, eu sou o Guardião. Irei lhe ajudar a monitorar sua turbina e também sanar dúvidas técnicas sobre ela.'));
                    await turnContext.sendActivity(await this.translator.t('Envie "Ajuda" e eu exibirei os principais comandos. Me avalie enviando "Avaliar Guardião", sua avaliação é importante!'));

                }

                if (turnContext._activity.channelId.toLowerCase() == 'alexa') {
                    await turnContext.sendActivity(await this.translator.t('Olá prazer, eu sou o Guardião.'));                    
                }
               
            }
        }

    }

    // O dispatch roteia as entradas para o melhor modelo
    // https://docs.microsoft.com/pt-br/azure/bot-service/bot-builder-tutorial-dispatch?view=azure-bot-service-4.0&tabs=cs
    async dispatchToIntentAsync(context, intent, entities) {
        var currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        await storage.init();

        //Efetua login de usuário através de uma imagem pré-treinada no custom vision e identifica o usuário como administrador
        if (context._activity.channelId !== 'alexa') {

            if (('attachments' in context.activity) && (context.activity['attachments'][0].contentType !== 'image/jpeg')) {
                await context.sendActivity(await this.translator.t('O anexo enviado é inválido. Envie apenas imagens JPG.'));                  
                await this.previousIntent.set(context, { intentName: null });
                return;            
            } else if (('attachments' in context.activity) && (context.activity['attachments'][0].contentType === 'image/jpeg')) {
            
                await context.sendActivity(await this.translator.t('Por favor aguarde, efetuando reconhecimento de imagem...'));        

                await this.conversationData.set(context, { endDialog: false });
                await this.identificarUsuarioFaceDialog.run(context, this.dialogState, entities);
                
                conversationData.endDialog = await this.identificarUsuarioFaceDialog.isDialogComplete();
                                

                /*
                await this.conversationData.set(context, { endDialog: false });
                await this.identificarUsuarioDialog.run(context, this.dialogState, entities);
                
                conversationData.endDialog = await this.identificarUsuarioDialog.isDialogComplete();
                */

                if (conversationData.endDialog) {
                    var identificacao = await this.identificarUsuarioFaceDialog.getIdentificacao();    
                   
                   console.log(identificacao);
                   if ((identificacao !== '') && (identificacao !== 'none')) {                       
                       await context.sendActivity(await this.translator.t('Olá ' + identificacao + '. Você agora está em modo administrativo.'));                
                       await storage.setItem(context._activity.from.id + 'login', identificacao);            
                   } else {
                       await context.sendActivity(await this.translator.t('A foto não foi reconhecida com nenhum dos usuários cadastrados. Tente novamente.'));                  
                   }
                   
                }                      

                await this.previousIntent.set(context, { intentName: null });
                return;                
            }
                    
        }


        console.log('previousIntent.intentName: ' + previousIntent.intentName);
        console.log('conversationData.endDialog: ' + conversationData.endDialog);
        console.log('intent: ' + intent);

        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = intent;
        } else {
            currentIntent = intent;
            await this.previousIntent.set(context, { intentName: intent });
        }
 
        console.log('currentIntent: ' + currentIntent);
        
        // Tratamento via LUIS
        if ((intent === 'Configurar_Tag_Alerta') || (currentIntent === 'Configurar_Tag_Alerta')) {
            
            const usuario = await storage.getItem(context._activity.from.id + 'login');
            if (usuario === undefined) {
                await context.sendActivity(await this.translator.t('Desculpe, mas você não tem as permissões necessárias para acessar está funcionalidade. Efetue o login enviando sua imagem de identificação.'));                
                await this.previousIntent.set(context, { intentName: null });
                return;
            }
            
            await this.conversationData.set(context, { endDialog: false });
            await this.configurarTagAlertaDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.configurarTagAlertaDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }
        } else if ((intent === 'Configurar_Tag_Minimo') || (currentIntent === 'Configurar_Tag_Minimo')) {

            const usuario = await storage.getItem(context._activity.from.id + 'login');
            if (usuario === undefined) {
                await context.sendActivity(await this.translator.t('Desculpe, mas você não tem as permissões necessárias para acessar está funcionalidade. Efetue o login enviando sua imagem de identificação.'));                
                await this.previousIntent.set(context, { intentName: null });
                return;
            }
            
            await this.conversationData.set(context, { endDialog: false });
            await this.configurarTagMinimoDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.configurarTagMinimoDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }
        } else if ((intent === 'Configurar_Tag_Maximo') || (currentIntent === 'Configurar_Tag_Maximo')) {

            const usuario = await storage.getItem(context._activity.from.id + 'login');
            if (usuario === undefined) {
                await context.sendActivity(await this.translator.t('Desculpe, mas você não tem as permissões necessárias para acessar está funcionalidade. Efetue o login enviando sua imagem de identificação.'));                
                await this.previousIntent.set(context, { intentName: null });
                return;
            }
            
            await this.conversationData.set(context, { endDialog: false });
            await this.configurarTagMaximoDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.configurarTagMaximoDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Obter_Valor') || (currentIntent === 'Obter_Valor')) {

            await this.conversationData.set(context, { endDialog: false });
            await this.obterValorDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.obterValorDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }
 
        } else if ((intent === 'Checar_Vida_Util') || (currentIntent === 'Checar_Vida_Util')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.checarVidaUtilDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.checarVidaUtilDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Informar_Sensores') || (currentIntent === 'Informar_Sensores')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.informarSensoresDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.informarSensoresDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Ativar_Monitoramento') || (currentIntent === 'Ativar_Monitoramento')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.ativarMonitoramentoDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.ativarMonitoramentoDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Desativar_Monitoramento') || (currentIntent === 'Desativar_Monitoramento')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.desativarMonitoramentoDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.desativarMonitoramentoDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Ajudar') || (currentIntent === 'Ajudar')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.ajudarDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.ajudarDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Responder_Idioma') || (currentIntent === 'Responder_Idioma')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.idiomaDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.idiomaDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Avaliar_Opinar') || (currentIntent === 'Avaliar_Opinar')) {
            await this.conversationData.set(context, { endDialog: false });
            await this.avaliarDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.avaliarDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
            }

        } else if ((intent === 'Retornar_Usuario_Logado') || (currentIntent === 'Retornar_Usuario_Logado')) {

            const usuario = await storage.getItem(context._activity.from.id + 'login');
            if (usuario !== undefined) {
                await context.sendActivity(await this.translator.t(usuario + ' está logado atualmente.'));            
            } else {               
                await context.sendActivity(await this.translator.t('Nenhum usuário está logado atualmente. Para logar, envie sua imagem de identificação.'));                            
            }            
            await this.previousIntent.set(context, { intentName: null });

        } else if ((intent === 'Desconectar_Usuario') || (currentIntent === 'Desconectar_Usuario')) {

            const usuario = await storage.getItem(context._activity.from.id + 'login');
            if (usuario !== undefined) {
                await context.sendActivity(await this.translator.t(usuario + ' foi desconectado(a)!'));                            
                await storage.removeItem(context._activity.from.id + 'login');
            } else {               
                await context.sendActivity(await this.translator.t('Nenhum usuário está logado atualmente. Para logar, envie sua imagem de identificação.'));                            
            }
            await this.previousIntent.set(context, { intentName: null });

        } else {
        
            var result = await this.qnaMaker.getAnswers(context);

            if (result[0]) {
                await context.sendActivity(await this.translator.t(`${result[0].answer}`));
            } else {
                await context.sendActivity(await this.translator.t('Dúvidas quanto a utilização do Guardião? Tente enviar "Instruções de Uso".'));
            }
        }
    
    }

}

module.exports.Guardiao = Guardiao;
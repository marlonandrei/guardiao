const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');
const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');
const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const { Translator } = require('../translator');

const mysql = require('mysql');
const extenso = require('numero-por-extenso');
var con = "";

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_PROMPT';

var endDialog = '';

class ConfigurarTagAlertaDialog extends ComponentDialog {

    constructor(conservsationState, userState) {
        super('configurarTagAlertaDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT, this.numeroPessoasValidator));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.obterTag.bind(this),
            this.obterValor.bind(this),
            this.confirmarValores.bind(this),
            this.configurarAlerta.bind(this)
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

    async obterTag(step) {
        endDialog = false;

        if ('tag' in step._info.options) {
            step.values.tag = step._info.options.tag[0];
            return await step.continueDialog();
        } else {
            return await step.prompt(TEXT_PROMPT, await this.translator.t('Qual a tag que deseja configurar?'));
        }

    }

    async obterValor(step) {

        //Pega tag 
        if (!step.values.tag) {
            step.values.tag = step.result;
        }

        if ('valor' in step._info.options) {
            step.values.valor = step._info.options.valor[0];
            return await step.continueDialog();
        } else {
            return await step.prompt(NUMBER_PROMPT, await this.translator.t('Qual o valor para setar de alerta?'));
        }

    }

    async confirmarValores(step) {

        //Pega valor
        if (!step.values.valor) {
            step.values.valor = step.result;
        }

        //Remove espaços em branco
        step.values.tag = step.values.tag.replace(/ /g, "");        

        //Verifica se o valor é digitado por extenso ou numero e converte sempre em numero
        if (!(!isNaN(parseFloat(step.values.valor)) && isFinite(step.values.valor))) {

            var cont;
            var nextenso = '';
            for (cont = 1; cont <= 1000; cont++) {
                nextenso = extenso.porExtenso(cont);

                if (nextenso.toLowerCase() === step.values.valor.toLowerCase()) {
                    step.values.valor = cont;
                    break;
                }
            }
        }
        
        var msg = `Verifique os dados: Tag: ${step.values.tag} - Valor: ${step.values.valor}\n`;

        await step.context.sendActivity(await this.translator.t(msg));
        return await step.prompt(CONFIRM_PROMPT, await this.translator.t('Confirma configuração de valor do alerta?'), ['yes', 'no']);
    }

    async configurarAlerta(step) {
        if (step.result === true) {

            //Troca traço pelo underline: necessário pois o indusoft so aceitava underline como nome dos campos
            step.values.tag = step.values.tag.replace(/-/gi, '_');
            step.values.tag = step.values.tag.replace(/ /gi, '');
            step.values.tag = step.values.tag.toUpperCase();

            con = mysql.createConnection({
                host: process.env.DB_host,
                user: process.env.DB_user,
                password: process.env.DB_password,
                port: process.env.DB_port,
                database: process.env.DB_database
            });

            con.connect(function (err) {
                if (err) throw err;
            });

            // MAC - Insere a reserva 
            var sql = "";
            sql += " update tagconfig ";
            sql += " set alerta= " + step.values.valor;
            sql += " where tag = '" + step.values.tag + "'";

            console.log(sql);
            
            con.query(sql, async function (err, result) {
                if (err) throw err;
            });

            await step.context.sendActivity(await this.translator.t("Configuração realizada com sucesso!"));
        }
        endDialog = true;
        return await step.endDialog();
    }

    async numeroPessoasValidator(promptContext) {
        return 1 == 1; //promptContext.recognized.succeeded && promptContext.recognized.value >= 1 && promptContext.recognized.value <= 50;
    }

    async isDialogComplete() {
        return endDialog;
    }

}

module.exports.ConfigurarTagAlertaDialog = ConfigurarTagAlertaDialog;
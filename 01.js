import fs from "fs";
import readline from "readline";
import csv from "csv-parser";
import { Transform } from "stream";
import { createObjectCsvWriter } from "csv-writer";
import cliProgress from "cli-progress";
import {
	toMoney,
	log,
	isValidCNPJ,
	isValidCPF,
	countFileLines,
} from "./functions.js";

// Barra de progresso (Firulinha)
const progress = new cliProgress.SingleBar(
	{
		format: "progress [{bar}] {percentage}% | {value}/{total} | {duration}s",
		clearOnComplete: false,
	},
	cliProgress.Presets.shades_classic
);

async function csvToArray(file) {
	log.green("Iniciando cache, aguarde...", Date());

	return new Promise(async (resolve, reject) => {
		const arrayObj = [];
		let count = 0;
		// Somente para montar a barra de progresso, aumenta o tempo de execução
		const totalLines = await countFileLines(file);

		let installments = 0;

		progress.start(totalLines - 1, 0);
		const stream = fs
			.createReadStream(file, "utf8")
			.pipe(csv())
			.on("data", function (csvrow) {
				/* Valida o documento ******************************************************************************* */
				const doc = csvrow.nrCpfCnpj;
				// Valida de acordo com o tamanho
				const isValidDoc =
					doc.length < 14 ? isValidCPF(doc) : isValidCNPJ(doc);
				// Adiciona no próprio campo se é válido ou não
				csvrow.nrCpfCnpj =
					csvrow.nrCpfCnpj +
					(isValidDoc ? " [VALIDO]" : " [INVALIDO]");
				// Adiciona um novo campo dizendo se o documento é válido
				csvrow.nrCpfCnpjValidado = isValidDoc ? " VALIDO" : " INVALIDO";
				/* ************************************************************************************************** */
				/* Valida e corrige os valores ********************************************************************** */
				const { vlTotal, vlMora, vlMulta, qtPrestacoes } = csvrow;
				csvrow.vlTotal = parseFloat(vlTotal).toFixed(2);
				csvrow.vlPresta = parseFloat(vlTotal / qtPrestacoes).toFixed(2);
				csvrow.vlMora = parseFloat(vlMora).toFixed(2);
				csvrow.vlMulta = parseFloat(vlMulta).toFixed(2);
				csvrow.vlAtual =
					parseFloat(csvrow.vlPresta) +
					parseFloat(csvrow.vlMora) +
					parseFloat(csvrow.vlMulta);
				/* ************************************************************************************************** */
				/* Altera a última parcela modificando o valor para ficar correto a divisão do total pelas parcelas.  */
				installments++;
				// Se a contagem de parcelas for igual a quantidade da lista, faz o cálculo do ajuste
				if (installments == parseFloat(csvrow.qtPrestacoes)) {
					// Zera a contagem
					installments = 0;
					// Recupera a diferença
					const diff = parseFloat(
						csvrow.vlTotal - csvrow.vlPresta * csvrow.qtPrestacoes
					).toFixed(2);
					csvrow.diff = parseFloat(diff);
					// Se for negativo realiza a subtração, se for positivo, adiciona no valor
					csvrow.vlPresta =
						diff < 0
							? csvrow.vlPresta - Math.abs(diff)
							: csvrow.vlPresta + Math.abs(diff);
				}
				/* ************************************************************************************************** */
				/* Formatação dos valores para Moeda Real Brasileira */
				csvrow.vlTotal = toMoney(csvrow.vlTotal);
				csvrow.vlPresta = toMoney(csvrow.vlPresta);
				csvrow.vlMora = toMoney(csvrow.vlMora);
				csvrow.vlMulta = toMoney(csvrow.vlMulta);
				csvrow.vlAtual = toMoney(csvrow.vlAtual);
				/* ************************************************************************************************** */
				count++;
				arrayObj.push(csvrow);
				progress.update(count);
			})
			.on("end", function () {
				progress.stop();
				resolve({ arrayObj, count });
				log.green("Cache finalizado. ", Date());
			})
			.on("error", function (err) {
				reject(err);
			});
	});
}

const { arrayObj, count } = await csvToArray("./data.csv");
log.dots();
log.red(`Foram processados ${count} registros!`);
log.dots();
fs.writeFile(
	"./processados/array-object.json",
	JSON.stringify(arrayObj, null, 2),
	(error) => {}
);
log.green("Finalizado!");

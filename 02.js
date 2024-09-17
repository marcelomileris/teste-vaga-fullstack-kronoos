import fs from "fs";
import csv from "csv-parser";
import { createObjectCsvWriter } from "csv-writer";
import cliProgress from "cli-progress";
import {
	toMoney,
	isValidCNPJ,
	isValidCPF,
	log,
	countFileLines,
} from "./functions.js";

let csvHeaders = [];

const file = "./data.csv";
const processedData = "./processados/processed-data.csv";

// Somente para montar a barra de progresso, aumenta o tempo de execução
const totalLines = await countFileLines(file);
let count = 0;
let installments = 0;

// Barra de progresso
const progress = new cliProgress.SingleBar(
	{
		format: "progress [{bar}] {percentage}% | {value}/{total} | {duration}s",
		clearOnComplete: false,
	},
	cliProgress.Presets.shades_classic
);

progress.start(totalLines - 1, 0);

// Criar o csvWriter
let csvWriter;

// Lê o CSV e processa os dados
fs.createReadStream(file, "utf8")
	.pipe(csv())
	.on("headers", (headers) => {
		// Configura os cabeçalhos dinamicamente com base no arquivo de origem
		csvHeaders = headers;

		// Inicializa o csvWriter assim que os cabeçalhos forem lidos
		csvWriter = createObjectCsvWriter({
			path: processedData,
			header: csvHeaders.map((header) => ({ id: header, title: header })),
			encoding: "utf8",
			append: true, // Garante que o conteúdo será acrescentado em vez de sobrescrito
		});
	})
	.on("data", (csvrow) => {
		/* Valida o documento */
		const doc = csvrow.nrCpfCnpj;
		const isValidDoc = doc.length < 14 ? isValidCPF(doc) : isValidCNPJ(doc);
		csvrow.nrCpfCnpj =
			csvrow.nrCpfCnpj + (isValidDoc ? " [VALIDO]" : " [INVALIDO]");

		/* Valida e corrige os valores */
		const { vlTotal, vlMora, vlMulta, qtPrestacoes } = csvrow;
		csvrow.vlTotal = parseFloat(vlTotal).toFixed(2);
		csvrow.vlPresta = parseFloat(vlTotal / qtPrestacoes).toFixed(2);
		csvrow.vlMora = parseFloat(vlMora).toFixed(2);
		csvrow.vlMulta = parseFloat(vlMulta).toFixed(2);
		csvrow.vlAtual =
			parseFloat(csvrow.vlPresta) +
			parseFloat(csvrow.vlMora) +
			parseFloat(csvrow.vlMulta);

		/* Ajusta última parcela */
		installments++;
		if (installments == parseFloat(csvrow.qtPrestacoes)) {
			installments = 0;
			const diff = parseFloat(
				csvrow.vlTotal - csvrow.vlPresta * csvrow.qtPrestacoes
			).toFixed(2);
			csvrow.diff = parseFloat(diff);
			csvrow.vlPresta =
				diff < 0
					? csvrow.vlPresta - Math.abs(diff)
					: csvrow.vlPresta + Math.abs(diff);
		}

		/* Formatação dos valores */
		csvrow.vlTotal = toMoney(csvrow.vlTotal);
		csvrow.vlPresta = toMoney(csvrow.vlPresta);
		csvrow.vlMora = toMoney(csvrow.vlMora);
		csvrow.vlMulta = toMoney(csvrow.vlMulta);
		csvrow.vlAtual = toMoney(csvrow.vlAtual);

		// Escreve a linha processada diretamente no arquivo CSV
		csvWriter
			.writeRecords([csvrow]) // Escreve uma linha de cada vez
			.then(() => {
				count++;
				progress.update(count);
			})
			.catch((error) => {
				log.red("Erro ao escrever o arquivo:", error);
			});
	})
	.on("end", () => {
		progress.stop();
		log.green("Finalizado!");
	});

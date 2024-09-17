import fs from "fs";

/* Converte o valor para o formato BRL */
export function toMoney(value, format = "pt-BR", currency = "BRL") {
	const options = {
		style: "currency",
		currency: currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	};
	return isNaN(value)
		? value
		: new Intl.NumberFormat(format, options).format(value);
}
/* ***************************************************** */

/* Função para deixar o log colorido */
const resetColor = "\x1b[0m";
export const log = {
	green: (text) => console.log("\x1b[32m" + text + resetColor),
	red: (text) => console.log("\x1b[31m" + text + resetColor),
	blue: (text) => console.log("\x1b[34m" + text + resetColor),
	yellow: (text) => console.log("\x1b[33m" + text + resetColor),
	dots: () =>
		console.log(
			"\x1b[33m" +
				"*******************************************" +
				resetColor
		),
};
/* ***************************************************** */

/* Validações de CPF e CNPJ */
export function isValidCPF(value) {
	// Remove qualquer coisa que não seja dígito
	value = value.replace(/[^\d]+/g, "");
	// 11 dígitos para CPF
	if (value.length !== 11 || /^(\d)\1{10}$/.test(value)) {
		return false;
	}
	if (value.length === 11) {
		let sum;
		let rest;
		// Verificação do primeiro dígito verificador
		sum = 0;
		for (let i = 1; i <= 9; i++) {
			sum += parseInt(value.substring(i - 1, i)) * (11 - i);
		}
		rest = (sum * 10) % 11;
		if (rest === 10 || rest === 11) rest = 0;
		if (rest !== parseInt(value.substring(9, 10))) return false;
		// Verificação do segundo dígito verificador
		sum = 0;
		for (let i = 1; i <= 10; i++) {
			sum += parseInt(value.substring(i - 1, i)) * (12 - i);
		}
		rest = (sum * 10) % 11;
		if (rest === 10 || rest === 11) rest = 0;
		if (rest !== parseInt(value.substring(10, 11))) return false;
		return true;
	}
}

export function isValidCNPJ(value) {
	// Remove qualquer coisa que não seja dígito
	value = value.replace(/[^\d]+/g, "");
	// CNPJ deve ter 14 dígitos
	if (value.length !== 14 || /^(\d)\1{13}$/.test(value)) {
		return false;
	}
	let size = value.length - 2;
	let numbers = value.substring(0, size);
	let digitos = value.substring(size);
	let sum = 0;
	let pos = size - 7;
	// Validação do primeiro dígito verificador
	for (let i = size; i >= 1; i--) {
		sum += numbers.charAt(size - i) * pos--;
		if (pos < 2) pos = 9;
	}
	let resultado = sum % 11 < 2 ? 0 : 11 - (sum % 11);
	if (resultado !== parseInt(digitos.charAt(0))) return false;
	// Validação do segundo dígito verificador
	size = size + 1;
	numbers = value.substring(0, size);
	sum = 0;
	pos = size - 7;
	for (let i = size; i >= 1; i--) {
		sum += numbers.charAt(size - i) * pos--;
		if (pos < 2) pos = 9;
	}
	resultado = sum % 11 < 2 ? 0 : 11 - (sum % 11);
	if (resultado !== parseInt(digitos.charAt(1))) return false;
	return true;
}
/* ***************************************************** */

export async function countFileLines(file) {
	return new Promise((resolve, reject) => {
		let lineCount = 0;
		const bufferSize = 256 * 1024; // Tamanho do buffer (256 KB)
		const buffer = Buffer.alloc(bufferSize);
		let fileDescriptor;
		// Abre o arquivo para leitura
		fs.open(file, "r", (err, fd) => {
			if (err) {
				reject(err);
				return;
			}
			fileDescriptor = fd;
			// Função para ler o arquivo em blocos
			const readNextBlock = () => {
				fs.read(
					fileDescriptor,
					buffer,
					0,
					bufferSize,
					null,
					(err, bytesRead) => {
						if (err) {
							reject(err);
							return;
						}
						// Se nenhum byte foi lido, finaliza a contagem
						if (bytesRead === 0) {
							fs.close(fileDescriptor, () => resolve(lineCount));
							return;
						}
						// Conta o número de quebras de linha no bloco lido
						let chunk = buffer.toString("utf8", 0, bytesRead);
						lineCount += (chunk.match(/\n/g) || []).length;
						// Lê o próximo bloco
						readNextBlock();
					}
				);
			};
			// Inicia a leitura do arquivo em blocos
			readNextBlock();
		});
	});
}
/* ***************************************************** */

/* ***************************************************** */

/* ***************************************************** */

/* ***************************************************** */

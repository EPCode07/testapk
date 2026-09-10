import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import { getUsuario } from '../../lib/user/userStorage';


interface ReportItem {
    id: string;
    file_name: string;
    storage_url: string;
    description: string | null;
    created_at: string;
}

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET;

export async function generatePhotoReportPDF(items: ReportItem[], basePdfUri?: string) {
    try {
        let pdfDoc: PDFDocument;

        if (basePdfUri) {
            const basePdfBytes = await FileSystem.readAsStringAsync(basePdfUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            pdfDoc = await PDFDocument.load(basePdfBytes);
        } else {
            pdfDoc = await PDFDocument.create();
            pdfDoc.addPage([595.28, 841.89]);
        }

        const page = pdfDoc.getPages()[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);



        let startXLeft = 50;
        let startXRight = 310;
        const initialStartY = 500;

        const boxWidth = 200;
        const boxHeight = boxWidth * (5 / 4);
        const rowHeightStep = boxHeight + 95;

        let currentPage = page;

        const imagePromises = items.map(async (item, i) => {
            try {
                const imageBytes = await FileSystem.downloadAsync(
                    item.storage_url,
                    FileSystem.cacheDirectory + `temp_img_${i}.jpg`
                );

                const manipResult = await ImageManipulator.manipulateAsync(
                    imageBytes.uri,
                    [{ resize: { width: 800 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );

                const finalUri = manipResult.uri;

                const imgBase64 = await FileSystem.readAsStringAsync(finalUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const binaryString = global.atob ? global.atob(imgBase64) : Buffer.from(imgBase64, 'base64').toString('binary');
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let j = 0; j < len; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                }

                const embeddedImage = await pdfDoc.embedJpg(bytes);

                return { index: i, item, embeddedImage };
            } catch (imgError) {
                console.error(`Error procesando la imagen ${i}:`, imgError);
                return null;
            }
        });

        const downloadedImages = await Promise.all(imagePromises);
        let currentValidIndex = 0;

        for (let i = 0; i < downloadedImages.length; i++) {
            const result = downloadedImages[i];
            if (!result) continue;

            const { index, item, embeddedImage } = result;
            const indexOnPage = currentValidIndex % 4;

            if (indexOnPage === 0 && currentValidIndex > 0) {
                currentPage = pdfDoc.addPage();
            }

            const isRightColumn = indexOnPage % 2 !== 0;
            const currentX = isRightColumn ? startXRight : startXLeft;
            const rowIndex = Math.floor(indexOnPage / 2);
            const currentY = initialStartY - (rowIndex * rowHeightStep);

            try {
                currentPage.drawImage(embeddedImage, {
                    x: currentX,
                    y: currentY,
                    width: boxWidth,
                    height: boxHeight,
                });

                const textSize = 9;
                const lineHeight = 11;
                const prefixText = `Imagen ${index + 1}: `;
                const contentText = item.description || 'Sin descripción';
                const prefixWidth = fontBold.widthOfTextAtSize(prefixText, textSize);

                const words = contentText.split(' ');
                const lines: string[] = [];
                let currentLine = '';
                const firstLineMaxWidth = boxWidth - prefixWidth;

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const testWidth = fontBold.widthOfTextAtSize(testLine, textSize);
                    const maxWidthAllowed = lines.length === 0 ? firstLineMaxWidth : boxWidth;

                    if (testWidth > maxWidthAllowed && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                if (currentLine) {
                    lines.push(currentLine);
                }

                let currentTextY = currentY - 15;

                currentPage.drawText(prefixText, {
                    x: currentX,
                    y: currentTextY,
                    size: textSize,
                    font: fontBold,
                    color: rgb(139 / 255, 30 / 255, 34 / 255),
                });

                if (lines.length > 0) {
                    currentPage.drawText(lines[0], {
                        x: currentX + prefixWidth,
                        y: currentTextY,
                        size: textSize,
                        font: fontBold,
                        color: rgb(0, 0, 0),
                    });
                }

                for (let l = 1; l < lines.length; l++) {
                    currentTextY -= lineHeight;
                    currentPage.drawText(lines[l], {
                        x: currentX,
                        y: currentTextY,
                        size: textSize,
                        font: fontBold,
                        color: rgb(0, 0, 0),
                    });
                }

                currentTextY -= (lineHeight + 4);

                let formattedDate = 'Fecha no disponible';
                if (item.created_at) {
                    const parsedDate = new Date(item.created_at);
                    if (!isNaN(parsedDate.getTime())) {
                        formattedDate = `Fecha: ${parsedDate.toLocaleString()}`;
                    } else {
                        formattedDate = `Fecha: ${item.created_at}`;
                    }
                }

                currentPage.drawText(formattedDate, {
                    x: currentX,
                    y: currentTextY,
                    size: 8,
                    font: font,
                    color: rgb(0, 0, 0),
                });

            } catch (drawError) {
                console.error(`Error dibujando la imagen ${index}:`, drawError);
            }

            currentValidIndex++;
        }

        const pdfBytes = await pdfDoc.save();
        let binary = '';
        const bytes = new Uint8Array(pdfBytes);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        const base64Pdf = btoa(binary);

        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;
        const dia = fecha.getDate();
        const fechaHoy = `${dia}-${mes}-${año}`;

        const finalUri = `${FileSystem.cacheDirectory}Reporte_Fotografico_${fechaHoy}.pdf`;

        await FileSystem.writeAsStringAsync(finalUri, base64Pdf, {
            encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(finalUri, { mimeType: 'application/pdf', dialogTitle: 'Reporte' });
        }

    } catch (error) {
        console.error('Error al generar el reporte con plantilla:', error);
        alert('No se pudo generar el PDF.');
    }
}

export async function downloadWordReport(): Promise<void> {
    const usuario = await getUsuario();
    if (!usuario) {
        throw new Error('No hay un usuario configurado en este dispositivo.');
    }

    const url = `${BACKEND_URL}/report-word?usuario=${encodeURIComponent(usuario)}`;
    const destino = `${FileSystem.documentDirectory}reporte_${Date.now()}.docx`;

    console.log('📄 Descargando reporte desde:', url);

    // 1. Descargar el archivo real al almacenamiento de la app
    const resultado = await FileSystem.downloadAsync(url, destino, {
        headers: { 'x-api-secret': API_SECRET ?? '' },
    });

    if (resultado.status < 200 || resultado.status >= 300) {
        throw new Error(`No se pudo descargar el reporte (status ${resultado.status})`);
    }

    console.log('✅ Reporte descargado en:', resultado.uri);

    // 2. Abrir el selector nativo para verlo/compartirlo/guardarlo
    const disponible = await Sharing.isAvailableAsync();
    if (!disponible) {
        throw new Error('Este dispositivo no soporta compartir archivos.');
    }

    await Sharing.shareAsync(resultado.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        dialogTitle: 'Abrir o compartir reporte',
    });
}
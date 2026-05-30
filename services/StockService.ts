import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { StockImage } from '../types';

export class StockService {
    private static COL = 'stock_images';

    static async uploadStockImage(name: string, category: string, url: string, createdBy: string) {
        // Compress and resize BEFORE uploading
        const optimizedUrl = await this.compressImage(url);

        const id = 'stock_' + Date.now();
        const stockImage: StockImage = {
            id,
            name,
            category,
            url: optimizedUrl,
            createdAt: new Date().toISOString(),
            createdBy
        };

        await db.collection(this.COL).doc(id).set(stockImage);
        return stockImage;
    }

    static compressImage(dataUrl: string, maxSize = 1000, quality = 0.7): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            // Only set crossOrigin if it's an external URL
            if (dataUrl.startsWith('http')) {
                img.crossOrigin = "anonymous";
            }

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.naturalWidth;
                    let height = img.naturalHeight;

                    if (width === 0 || height === 0) {
                        reject(new Error("Bilden har ingen giltig storlek."));
                        return;
                    }

                    if (width > height) {
                        if (width > maxSize) {
                            height *= maxSize / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width *= maxSize / height;
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', quality));
                    } else {
                        reject(new Error("Kunde inte skapa canvas-kontext."));
                    }
                } catch (err) {
                    console.error("Canvas compression error:", err);
                    reject(new Error("Ett fel uppstod vid bildbehandlingen."));
                }
            };
            img.onerror = (err) => {
                console.error("Image loading error:", err);
                reject(new Error("Kunde inte ladda bilden."));
            };
            img.src = dataUrl;
        });
    }

    static async getStockImages(): Promise<StockImage[]> {
        const snapshot = await db.collection(this.COL).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => doc.data() as StockImage);
    }

    static async deleteStockImage(id: string) {
        return await db.collection(this.COL).doc(id).delete();
    }

    static async getCategories(): Promise<string[]> {
        const images = await this.getStockImages();
        const cats = new Set(images.map(img => img.category));
        return Array.from(cats).sort();
    }
}

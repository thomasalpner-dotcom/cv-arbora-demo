# Arbetsflöde: Flytta utveckling mellan datorer

För att smidigt kunna arbeta med **Aventus CV-verktyg** på både din stationära dator och din bärbara dator ("den nya portabla"), rekommenderar jag starkt att använda **Git** och **GitHub** istället för OneDrive för källkoden.

OneDrive kan skapa konflikter med `node_modules`-mappen och låsa filer som byggverktygen behöver.

## Rekommenderad Process (Git + GitHub)

### 1. På din nuvarande (stationära) dator
Eftersom vi precis gjort ändringar, se till att allt är sparat och uppladdat:

1.  Öppna terminalen i VS Code.
2.  Kör följande kommandon:
    ```powershell
    git add .
    git commit -m "Lagt till generator för Personligt Brev och fixat Editor UI"
    git push
    ```

### 2. På din nya (bärbara) dator
Första gången du ska jobba:

1.  Se till att **Node.js** och **Git** är installerade.
2.  Klona projektet från GitHub:
    ```powershell
    git clone https://github.com/thomasalpner-dotcom/CV-Aventus-26.git
    cd CV-Aventus-26
    ```
3.  Installera alla beroenden:
    ```powershell
    npm install
    ```
4.  Skapa en `.env`-fil i roten (den sparas inte på GitHub av säkerhetsskäl) och klistra in din API-nyckel:
    ```
    VITE_API_KEY=din_google_gemini_api_nyckel_här
    ```
5.  Starta utvecklingsservern:
    ```powershell
    npm run dev
    ```

### 3. Daglig Rutin
När du byter dator:

*   **Innan du lämnar dator A:** Kör `git add .`, `git commit` och `git push`.
*   **När du sätter dig vid dator B:** Kör `git pull` för att hämta det senaste innan du börjar koda.

## OneDrive (Alternativ - Ej Rekommenderat)
Om du *måste* använda OneDrive:
1.  Se till att mappen `node_modules` **INTE** synkas. Detta är svårt med OneDrive.
2.  Om mappen synkas kommer du få massor av fel och prestandaproblem.
3.  **Slutsats:** Undvik OneDrive för källkodsprojekt (React/Next.js). Använd det för dokument/foton, men GitHub för koden.

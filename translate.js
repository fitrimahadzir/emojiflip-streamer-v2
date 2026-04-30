import fs from 'fs';
import path from 'path';

function translateApp() {
  const filePath = path.join(process.cwd(), 'src/App.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/'Buah'/g, "'Fruits'");
  content = content.replace(/Buah/g, "Fruits");
  content = content.replace(/'Riak Wajah'/g, "'Faces'");
  content = content.replace(/Riak Wajah/g, "Faces");
  content = content.replace(/'Kenderaan'/g, "'Vehicles'");
  content = content.replace(/Kenderaan/g, "Vehicles");
  content = content.replace(/'Haiwan'/g, "'Animals'");
  content = content.replace(/Haiwan/g, "Animals");
  
  content = content.replace(/Gantikan dengan text atau path gambar seperti/g, "Replace with text or image path like");
  
  content = content.replace(/LELAKI/g, "MEN");
  content = content.replace(/WANITA/g, "WOMEN");
  content = content.replace(/scoreLelaki/g, "scoreMen");
  content = content.replace(/setScoreLelaki/g, "setScoreMen");
  content = content.replace(/scoreWanita/g, "scoreWomen");
  content = content.replace(/setScoreWanita/g, "setScoreWomen");
  
  content = content.replace(/Kesalahan:/g, "Mistakes:");
  content = content.replace(/Kategori:/g, "Category:");
  
  content = content.replace(/Klik sekali untuk tukar giliran\. Klik sekali lagi untuk tambah markah\. Right-click untuk tolak markah\./g, "Click once to change turns. Click again to add score. Right-click to deduct score.");
  
  content = content.replace(/Amaran/g, "Warning");
  content = content.replace(/Anda telah mencapai 10 kesalahan!/g, "You have reached 10 mistakes!");
  content = content.replace(/Giliran Seterusnya \(Next Turn\)/g, "Next Turn");
  
  content = content.replace(/Tahniah!/g, "Congratulations!");
  content = content.replace(/Anda telah menjumpai semua pasangan dengan \{mistakes\} kesalahan\./g, "You have found all pairs with {mistakes} mistakes.");
  
  content = content.replace(/Berdasarkan permainan/g, "Based on the game");
  
  fs.writeFileSync(filePath, content);
  
  const cardPath = path.join(process.cwd(), 'src/components/Card.tsx');
  let cardContent = fs.readFileSync(cardPath, 'utf8');
  cardContent = cardContent.replace(/LELAKI/g, "MEN");
  cardContent = cardContent.replace(/WANITA/g, "WOMEN");
  fs.writeFileSync(cardPath, cardContent);
  
  console.log('Translated successfully');
}

translateApp();

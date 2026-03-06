const { GoogleGenAI } = require("@google/genai");
const { Command } = require("commander");
const fs = require("fs-extra");
const path = require("path");
const dotenv = require("dotenv");
const inquirer = require("inquirer");
const chalk = require("chalk");
const cliProgress = require("cli-progress");

dotenv.config();

const program = new Command();

// Model configurations and pricing
const MODELS = {
    'nano-banana': {
        id: 'models/gemini-3.1-flash-image-preview',
        name: 'Nano Banana (Flash)',
        pricing: { '512': 0.045, '1K': 0.067, '2K': 0.101, '4K': 0.151 }
    },
    'nano-banana-pro': {
        id: 'models/gemini-3-pro-image-preview',
        name: 'Nano Banana Pro',
        pricing: { '512': 0.08, '1K': 0.134, '2K': 0.134, '4K': 0.24 }
    },
    'imagen-3': {
        id: 'models/imagen-3.0-generate-001',
        name: 'Imagen 3',
        pricing: { 'default': 0.03 }
    },
    'imagen-4': {
        id: 'models/imagen-4.0-generate-001',
        name: 'Imagen 4',
        pricing: { 'default': 0.04 }
    }
};

function getClient() {
    if (!process.env.GOOGLE_API_KEY) {
        console.error(chalk.red("Error: GOOGLE_API_KEY is not set in .env file"));
        process.exit(1);
    }
    return new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
}

async function generatePrompts(count, outputFile) {
    const ai = getClient();
    const prompt = `Generate ${count} unique, creative, and highly descriptive image generation prompts for an AI image generator. 
    Each prompt should be on a single line. 
    Focus on variety: landscapes, portraits, abstract art, sci-fi, etc.
    Do not include any numbers, bullets, or extra text. Just the prompts, one per line.`;

    console.log(chalk.blue(`\nGenerating ${count} random prompts using Gemini...`));

    try {
        const result = await ai.models.generateContent({
            model: "models/gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        const text = result.candidates[0].content.parts[0].text;
        const prompts = text.split('\n').filter(line => line.trim().length > 0).slice(0, count);
        await fs.writeFile(outputFile, prompts.join('\n'));
        console.log(chalk.green(`Successfully saved ${prompts.length} prompts to ${outputFile}`));
    } catch (error) {
        console.error(chalk.red(`Error generating prompts: ${error.message}`));
    }
}

async function runInteractive() {
    console.log(chalk.cyan.bold("\n--- Imagen CLI Interactive Wizard ---"));

    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'mode',
            message: 'What would you like to do?',
            choices: [
                { name: 'Generate images from a single prompt', value: 'single' },
                { name: 'Generate images from a file', value: 'file' },
                { name: 'Generate a random list of prompts first', value: 'prompt-gen' }
            ]
        }
    ]);

    if (answers.mode === 'prompt-gen') {
        const promptGenAnswers = await inquirer.prompt([
            { type: 'input', name: 'count', message: 'How many prompts should I generate?', default: 10 },
            { type: 'input', name: 'output', message: 'Output file name?', default: 'prompts.txt' }
        ]);
        await generatePrompts(parseInt(promptGenAnswers.count), promptGenAnswers.output);
        return;
    }

    const genAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'prompt',
            message: 'Enter the prompt:',
            when: answers.mode === 'single'
        },
        {
            type: 'input',
            name: 'count',
            message: 'How many images for this prompt?',
            default: 1,
            when: answers.mode === 'single'
        },
        {
            type: 'input',
            name: 'file',
            message: 'Path to prompts file:',
            default: 'prompts.txt',
            when: answers.mode === 'file',
            validate: async (input) => (await fs.pathExists(input)) || "File does not exist"
        },
        {
            type: 'list',
            name: 'model',
            message: 'Which model would you like to use?',
            choices: Object.entries(MODELS).map(([key, val]) => ({ name: val.name, value: key }))
        },
        {
            type: 'list',
            name: 'res',
            message: 'Select resolution:',
            choices: ['512', '1K', '2K', '4K'],
            default: '1K',
            when: (ans) => ans.model.includes('banana')
        },
        {
            type: 'input',
            name: 'output',
            message: 'Output directory?',
            default: 'generated_images'
        }
    ]);

    await generateImages(genAnswers);
}

async function generateImages(options) {
    const ai = getClient();
    let prompts = [];
    if (options.file) {
        const content = await fs.readFile(options.file, 'utf-8');
        prompts = content.split('\n').filter(line => line.trim().length > 0);
    } else if (options.prompt) {
        const count = parseInt(options.count) || 1;
        prompts = Array(count).fill(options.prompt);
    } else {
        console.error(chalk.red("Error: No prompts provided."));
        return;
    }

    const modelKey = options.model || 'nano-banana';
    const modelConfig = MODELS[modelKey];
    const resolution = options.res || '1K';

    let costPerImage = 0;
    if (modelKey.includes('banana')) {
        costPerImage = modelConfig.pricing[resolution] || modelConfig.pricing['1K'];
    } else {
        costPerImage = modelConfig.pricing['default'];
    }

    const totalCost = (prompts.length * costPerImage).toFixed(3);

    console.log(chalk.yellow(`\nGeneration Summary:`));
    console.log(`Model: ${modelConfig.name}`);
    console.log(`Total Images: ${prompts.length}`);
    if (modelKey.includes('banana')) console.log(`Resolution: ${resolution}`);
    console.log(`Estimated Cost: $${totalCost}`);

    const { confirm } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Do you want to proceed with the generation?',
            default: false
        }
    ]);

    if (!confirm) {
        console.log(chalk.gray("Generation cancelled."));
        return;
    }

    const outputDir = options.output || 'generated_images';
    await fs.ensureDir(outputDir);

    const progressBar = new cliProgress.SingleBar({
        format: 'Generating |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Images',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    }, cliProgress.Presets.shades_classic);

    progressBar.start(prompts.length, 0);

    for (let i = 0; i < prompts.length; i++) {
        try {
            const prompt = prompts[i];

            const result = await ai.models.generateContent({
                model: modelConfig.id,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            // Handle multimodal response with inlineData (base64 image)
            const imagePart = result.candidates[0].content.parts.find(part => part.inlineData);

            if (imagePart) {
                const buffer = Buffer.from(imagePart.inlineData.data, 'base64');
                const fileName = `img_${Date.now()}_${i}.png`;
                await fs.writeFile(path.join(outputDir, fileName), buffer);
            } else {
                throw new Error("No image data found in response");
            }

            progressBar.update(i + 1);
        } catch (error) {
            progressBar.stop();
            console.error(chalk.red(`\nError generating image ${i + 1}: ${error.message}`));

            const { retry } = await inquirer.prompt([{
                type: 'confirm',
                name: 'retry',
                message: 'Do you want to skip this image and continue?',
                default: true
            }]);

            if (!retry) process.exit(1);
            progressBar.start(prompts.length, i + 1);
        }
    }

    progressBar.stop();
    console.log(chalk.green(`\nGeneration complete! Images saved to ${chalk.bold(outputDir)}`));
}

program
    .name("imagen")
    .description("CLI tool to generate images using Gemini/Imagen Developer APIs")
    .version("1.0.0");

program
    .command("prompt-gen")
    .description("Generate a list of random image descriptions")
    .option("-c, --count <number>", "Number of prompts to generate", "10")
    .option("-o, --output <file>", "Output file name", "prompts.txt")
    .action(async (options) => {
        await generatePrompts(parseInt(options.count), options.output);
    });

program
    .command("generate")
    .description("Generate images from prompts")
    .option("-p, --prompt <string>", "Single prompt to use")
    .option("-f, --file <path>", "File containing prompts (one per line)")
    .option("-c, --count <number>", "Number of images (if using single prompt)", "1")
    .option("-m, --model <key>", "Model key (nano-banana, nano-banana-pro, imagen-3, imagen-4)", "nano-banana")
    .option("-r, --res <string>", "Resolution for Nano Banana (512, 1K, 2K, 4K)", "1K")
    .option("-o, --output <dir>", "Output directory", "generated_images")
    .action(async (options) => {
        await generateImages(options);
    });

if (process.argv.length <= 2) {
    runInteractive();
} else {
    program.parse();
}

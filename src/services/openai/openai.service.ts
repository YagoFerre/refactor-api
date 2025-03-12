import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Dependency } from 'src/types/dependecy';
import { CodeMigrationResult } from 'src/types/migration-result';
import { ProjectDependenciesResponse } from 'src/types/project-dependencies.response';

@Injectable()
export class OpenaiService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async refactorJavaCode(
    sourceCode: string,
    filePath: string,
    targetJavaVersion: string,
    projectDependencies: Dependency[] = [],
  ): Promise<CodeMigrationResult> {
    const fileName = filePath.split(/[\/\\]/).pop();

    const prompt = `
	# Tarefa de Refatoração de Código Java para Spring Boot

	## Arquivo Original: \`${fileName}\`
	\`\`\`java
	${sourceCode}
	\`\`\`

	## Dependências Atuais do Projeto
	${JSON.stringify(projectDependencies, null, 2)}

	## Contexto do Projeto
	Este arquivo faz parte de um projeto Java sendo refatorado para Java ${targetJavaVersion} com Spring Boot 3.x.

	## Objetivo da Refatoração
	- Refatorar o código Java acima para Java ${targetJavaVersion} e Spring Boot 3.x
	- Manter a lógica de negócios original intacta
	- Atualizar APIs obsoletas para equivalentes modernas
	- Utilizar recursos do Java ${targetJavaVersion} quando apropriado

	## Instruções Específicas:
	1. Substitua APIs antigas por equivalentes modernos do Spring Boot
	2. Utilize recursos do Java ${targetJavaVersion} como expressões lambda, streams, switch expressions, etc. quando aplicável
	3. Modernize a manipulação de exceções e I/O
	4. Converta classes antigas de data/hora para a API java.time
	5. Mantenha a nomenclatura original de classes, métodos e variáveis
	6. Certifique-se de que todas as importações estejam corretas
	7. Adicione anotações Spring Boot (como @Service, @Repository, @RestController) se aplicável

	Por favor, forneça apenas o código refatorado sem explicações adicionais.
	
	## Formato de Resposta (responda EXATAMENTE neste formato JSON):
	{
		"code": "// Código Java refatorado aqui",
		"newDependencies": [
			{
			"groupId": "grupo da dependência",
			"artifactId": "artefato da dependência",
			"version": "versão recomendada compatível com Spring Boot 3.x",
			"description": "breve descrição do motivo dessa dependência"
			}
		]
	}`;

    const systemPrompt = `
	Você é um especialista em migração de código Java, focado na atualização de projetos Java 8 para Java 21 com Spring Boot 3.x. 
	Sua tarefa é refatorar código e identificar dependências necessárias. 
	Responda apenas no formato JSON solicitado.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1, // baixa temperatura para resultados melhores
      response_format: { type: 'json_object' },
    });

    try {
      const result = JSON.parse(
        response.choices[0].message.content || '',
      ) as CodeMigrationResult;
      return {
        code: result.code,
        newDependencies: result.newDependencies || [],
      };
    } catch (error) {
      console.error('Erro ao parsear resposta JSON:', error);

      return {
        code: response.choices[0].message.content || '',
        newDependencies: [],
      };
    }
  }

  async updatePomDependencies(
    pomXml: string,
    projectDependencies: any[],
  ): Promise<string> {
    const prompt = `
	# Atualização de Dependências Maven
	
	## pom.xml original
	\`\`\`xml
	${pomXml}
	\`\`\`
	
	## Dependências do projeto original
	${JSON.stringify(projectDependencies, null, 2)}
	
	## Tarefa
	Atualize o arquivo pom.xml acima para incluir todas as dependências necessárias do projeto original,
	mas usando versões compatíveis com Spring Boot 3.x e Java 21.
	
	Diretrizes:
	1. Mantenha todas as dependências Spring Boot existentes
	2. Adicione equivalentes modernos para as dependências do projeto original
	3. Remova dependências duplicadas ou conflitantes
	4. Atualize as versões para que sejam compatíveis com Spring Boot 3.x
	5. Adicione comentários explicativos quando necessário
	
	Por favor, forneça apenas o arquivo pom.xml atualizado sem explicações adicionais.`;

    const systemPrompt = `
	Você é um especialista em configuração Maven e dependências Java. 
	Seu trabalho é atualizar arquivos pom.xml para projetos Spring Boot modernos.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1, // temperatura baixa para maior assertividade
    });

    let pomAtualizado = response.choices[0].message.content?.trim() || '';

    // garantir que os blocos markdown não existam
    if (pomAtualizado?.startsWith('```xml')) {
      pomAtualizado = pomAtualizado.replace(/```xml\n/, '').replace(/```$/, '');
    }

    if (pomAtualizado?.startsWith('```')) {
      pomAtualizado = pomAtualizado.replace(/```\n/, '').replace(/```$/, '');
    }

    return pomAtualizado;
  }
}

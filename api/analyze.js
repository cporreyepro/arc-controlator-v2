```javascript id="x4m9qp"
import OpenAI from "openai";

const SYSTEM_PROMPT = `
Tu es ARC CONTROLATOR.

Tu compares les documents d’un dossier menuiserie :
- devis
- métrage
- commande
- ARC

Certains documents peuvent être :
- des scans,
- des PDF manuscrits,
- des images,
- des documents de travers.

Tu dois analyser attentivement tous les éléments.

Tu dois détecter :
- incohérences de dimensions
- produits différents
- couleurs différentes
- options manquantes
- sens d'ouverture incohérent
- type de pose incohérent
- accessoires manquants
- motorisation différente
- délais ou informations contradictoires

Réponds avec :

1. Résumé du dossier
2. Incohérences critiques
3. Incohérences moyennes
4. Points à confirmer
5. Décision :
FEU VERT / À VÉRIFIER / BLOCAGE
6. Actions à faire avant validation
`;

export default async function handler(req, res) {

  if(req.method !== "POST"){

    return res.status(405).json({
      error:"Méthode non autorisée."
    });

  }

  try{

    if(!process.env.OPENAI_API_KEY){

      return res.status(500).json({
        error:"OPENAI_API_KEY manquante dans Vercel."
      });

    }

    const { mode, docs } = req.body || {};

    if(
      !docs ||
      !Array.isArray(docs) ||
      docs.length < 4
    ){

      return res.status(400).json({
        error:"Les documents sont obligatoires."
      });

    }

    const content = [

      {
        type:"input_text",
        text:`
Mode demandé :
${mode || "Contrôle complet"}

Analyse tous les éléments.
Les documents peuvent être manuscrits ou scannés.
`
      }

    ];

    for(const doc of docs){

      content.push({

        type:"input_text",

        text:`
DOCUMENT :
${doc.label} - ${doc.name}
`

      });

      if(doc.kind === "image"){

        content.push({

          type:"input_image",

          image_url:doc.content,

          detail:"high"

        });

      }else{

        content.push({

          type:"input_text",

          text:
            doc.content ||
            "Aucun contenu exploitable."

        });

      }

    }

    const client = new OpenAI({

      apiKey:process.env.OPENAI_API_KEY

    });

    const response =
      await client.responses.create({

      model:"gpt-4.1-mini",

      input:[

        {

          role:"system",

          content:[

            {
              type:"input_text",
              text:SYSTEM_PROMPT
            }

          ]

        },

        {

          role:"user",

          content

        }

      ],

      max_output_tokens:3500

    });

    return res.status(200).json({

      report:
        response.output_text ||
        "Aucun rapport généré."

    });

  }catch(error){

    return res.status(500).json({

      error:
        error.message ||
        "Erreur analyse."

    });

  }

}
```

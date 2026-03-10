import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calculator, Camera, ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";

const TaskPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-lg mx-auto px-5 pt-8">
        {/* Back */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground mb-8">
          <ArrowLeft size={16} />
          <span className="font-display text-sm">Voltar</span>
        </button>

        {/* Teacher header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-10 h-10 rounded-full bg-math/15 flex items-center justify-center">
            <Calculator size={18} className="text-math" />
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg text-foreground">
              Prof. JTC Matemática
            </h1>
            <p className="font-display text-xs text-muted-foreground">Adição com reagrupamento</p>
          </div>
        </motion.div>

        {/* Instruction */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border border-l-4 border-l-math rounded-lg p-6 mb-8 shadow-card"
        >
          <p className="font-body text-foreground leading-relaxed mb-4">
            Resolva a conta abaixo no papel, com calma. Mostre todos os passos que você fez. Quando terminar, tire uma foto e eu vou analisar.
          </p>
          <div className="bg-background rounded-lg p-6 text-center">
            <p className="font-display text-3xl font-semibold text-foreground tracking-wide">
              47 + 38
            </p>
          </div>
        </motion.div>

        {/* Mentor note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-secondary/50 rounded-lg p-4 mb-8"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-mentor" />
            <span className="font-display text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Mentor OmniaEdu</span>
          </div>
          <p className="font-body text-sm text-muted-foreground italic leading-relaxed">
            "Não tenha pressa. O importante é o caminho, não só a resposta."
          </p>
        </motion.div>

        {/* Camera button */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-primary text-primary-foreground font-display font-medium py-4 rounded-lg flex items-center justify-center gap-3 transition-colors"
        >
          <Camera size={20} />
          Tirar foto da resolução
        </motion.button>
      </div>
      <BottomNav />
    </div>
  );
};

export default TaskPage;

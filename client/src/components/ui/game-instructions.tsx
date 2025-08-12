interface GameInstructionsProps {
  targetWordClass: string;
  targetWordClassDescription: string;
}

export default function GameInstructions({ targetWordClass, targetWordClassDescription }: GameInstructionsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary/10 text-primary p-2 rounded-lg">
            <i className="fas fa-bullseye"></i>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Hitta ordet</h2>
        </div>
        
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full border border-purple-200">
          <span className="text-purple-700 font-medium">Sök efter: </span>
          <span className="text-purple-900 font-bold" data-testid="target-word-class">{targetWordClass.toUpperCase()}</span>
        </div>
      </div>
      
      <p className="text-gray-600">
        Klicka på ordet som är ett <strong>{targetWordClass.toLowerCase()}</strong> i meningen nedan.
        {targetWordClassDescription && (
          <span className="text-gray-500"> ({targetWordClassDescription})</span>
        )}
      </p>
    </div>
  );
}
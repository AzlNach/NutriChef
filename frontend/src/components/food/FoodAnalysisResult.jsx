import React, { useState, useEffect } from 'react';
import './FoodAnalysisResult.css';

const FoodAnalysisResult = ({ 
  analysisResult, 
  onEditFood, 
  onRemoveFood, 
  onConfirm, 
  isEditing = false 
}) => {
  const [editingFood, setEditingFood] = useState(null);
  const [editValues, setEditValues] = useState({});

  const { 
    detected_foods = [], 
    total_nutrition = {}, 
    confidence_overall = 0,
    main_food = {},
    additional_notes = ''
  } = analysisResult || {};

  const handleEditClick = (food) => {
    setEditingFood(food.id);
    setEditValues({
      name: food.name,
      estimated_portion: food.estimated_portion || food.portion,
      portion_unit: food.portion_unit || food.unit
    });
  };

  const handleSaveEdit = (foodId) => {
    onEditFood(foodId, editValues);
    setEditingFood(null);
    setEditValues({});
  };

  const handleCancelEdit = () => {
    setEditingFood(null);
    setEditValues({});
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4CAF50'; // Green
    if (confidence >= 0.6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  if (!analysisResult) {
    return (
      <div className="analysis-result-container">
        <div className="no-result">
          <p>No analysis result available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-result-container">
      <div className="analysis-header">
        <h2>🍽️ Food Analysis Result</h2>
        
        {/* Main Food Information */}
        {main_food && main_food.name && (
          <div className="main-food-info">
            <h3 className="main-food-name">{main_food.name}</h3>
            {main_food.description && (
              <p className="main-food-description">{main_food.description}</p>
            )}
            {/* Display ingredients summary */}
            {detected_foods && detected_foods.length > 0 && (
              <div className="ingredients-summary">
                <h4>📋 Main Ingredients:</h4>
                <p>{detected_foods.map(food => food.name).join(', ')}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="overall-confidence">
          <span className="confidence-label">Overall Confidence:</span>
          <div 
            className="confidence-bar"
            style={{ '--confidence-color': getConfidenceColor(confidence_overall) }}
          >
            <div 
              className="confidence-fill"
              style={{ width: `${confidence_overall * 100}%` }}
            ></div>
            <span className="confidence-text">
              {getConfidenceText(confidence_overall)} ({Math.round(confidence_overall * 100)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      {additional_notes && (
        <div className="additional-notes">
          <h4>📝 Analysis Notes</h4>
          <p>{additional_notes}</p>
        </div>
      )}

      <div className="detected-foods">
        <h3>Detected Ingredients ({detected_foods.length})</h3>
        {detected_foods.map((food, index) => (
          <div key={food.id || index} className="food-item">
            <div className="food-header">
              <div className="food-info">
                {editingFood === (food.id || index) ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editValues.name}
                      onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                      className="food-name-input"
                    />
                    <div className="portion-inputs">
                      <input
                        type="number"
                        value={editValues.estimated_portion}
                        onChange={(e) => setEditValues({...editValues, estimated_portion: parseFloat(e.target.value)})}
                        className="portion-input"
                      />
                      <select
                        value={editValues.portion_unit}
                        onChange={(e) => setEditValues({...editValues, portion_unit: e.target.value})}
                        className="unit-select"
                      >
                        <option value="grams">grams</option>
                        <option value="cups">cups</option>
                        <option value="pieces">pieces</option>
                        <option value="slices">slices</option>
                        <option value="tablespoons">tablespoons</option>
                      </select>
                    </div>
                    <div className="edit-actions">
                      <button onClick={() => handleSaveEdit(food.id || index)} className="save-btn">
                        ✓ Save
                      </button>
                      <button onClick={handleCancelEdit} className="cancel-btn">
                        ✕ Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="food-display">
                    <h4 className="food-name">{food.name}</h4>
                    <p className="food-portion">
                      {food.estimated_portion || food.portion} {food.portion_unit || food.unit}
                      {food.category && <span className="food-category"> • {food.category}</span>}
                    </p>
                  </div>
                )}
              </div>

              <div className="food-confidence">
                <span 
                  className="confidence-badge"
                  style={{ backgroundColor: getConfidenceColor(food.confidence) }}
                >
                  {Math.round(food.confidence * 100)}%
                </span>
              </div>

              {!isEditing && editingFood !== (food.id || index) && (
                <div className="food-actions">
                  <button onClick={() => handleEditClick(food)} className="edit-btn">
                    ✏️
                  </button>
                  <button onClick={() => onRemoveFood(food.id || index)} className="remove-btn">
                    🗑️
                  </button>
                </div>
              )}
            </div>

            {food.nutrition && (
              <div className="nutrition-info">
                <div className="nutrition-grid">
                  <div className="nutrition-item">
                    <span className="nutrition-label">Calories</span>
                    <span className="nutrition-value">{Math.round(food.nutrition.calories || 0)}</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Protein</span>
                    <span className="nutrition-value">{(food.nutrition.protein || 0).toFixed(1)}g</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Carbs</span>
                    <span className="nutrition-value">{(food.nutrition.carbs || 0).toFixed(1)}g</span>
                  </div>
                  <div className="nutrition-item">
                    <span className="nutrition-label">Fat</span>
                    <span className="nutrition-value">{(food.nutrition.fat || 0).toFixed(1)}g</span>
                  </div>
                </div>
              </div>
            )}

            {food.notes && (
              <div className="food-notes">
                <small>{food.notes}</small>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="nutrition-summary">
        <h3>📊 Total Nutrition</h3>
        <div className="summary-grid">
          <div className="summary-item calories">
            <div className="summary-icon">🔥</div>
            <div className="summary-content">
              <span className="summary-label">Calories</span>
              <span className="summary-value">{Math.round(total_nutrition.calories || 0)}</span>
            </div>
          </div>
          <div className="summary-item protein">
            <div className="summary-icon">💪</div>
            <div className="summary-content">
              <span className="summary-label">Protein</span>
              <span className="summary-value">{(total_nutrition.protein || 0).toFixed(1)}g</span>
            </div>
          </div>
          <div className="summary-item carbs">
            <div className="summary-icon">🌾</div>
            <div className="summary-content">
              <span className="summary-label">Carbs</span>
              <span className="summary-value">{(total_nutrition.carbs || 0).toFixed(1)}g</span>
            </div>
          </div>
          <div className="summary-item fat">
            <div className="summary-icon">🥑</div>
            <div className="summary-content">
              <span className="summary-label">Fat</span>
              <span className="summary-value">{(total_nutrition.fat || 0).toFixed(1)}g</span>
            </div>
          </div>
        </div>
      </div>


      {confidence_overall < 0.7 && (
        <div className="low-confidence-warning">
          <div className="warning-icon">⚠️</div>
          <div className="warning-content">
            <p><strong>Low Confidence Detection</strong></p>
            <p>The AI had difficulty identifying some items. Please review and edit the results above.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodAnalysisResult;

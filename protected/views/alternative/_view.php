<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('positionStart_id')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->positionStart->name), array('position/view', 'id'=>$data->positionStart_id)); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('positionAlternative_id')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->positionAlternative->name), array('position/view', 'id'=>$data->positionAlternative_id)); ?>
	
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('description')); ?>:</b>
	<?php echo CHtml::encode($data->description); ?>
	<br />

</div>